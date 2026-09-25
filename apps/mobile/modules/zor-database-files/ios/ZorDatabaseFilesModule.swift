import Darwin
import ExpoModulesCore
import Foundation
import SQLite3

private struct MigrationOptions: Record {
  @Field var source: String = ""
  @Field var destination: String = ""
  @Field var temporary: String = ""
  @Field var lock: String = ""
}

public final class ZorDatabaseFilesModule: Module {
  private let migrationQueue = DispatchQueue(label: "com.zor.databasefiles", qos: .utility)
  private let chunkSize = 1024 * 1024

  public func definition() -> ModuleDefinition {
    Name("ZorDatabaseFiles")
    Events("onDatabaseMigrationProgress")

    AsyncFunction("ensureReady") { (options: MigrationOptions, promise: Promise) in
      self.migrationQueue.async {
        do {
          promise.resolve(try self.withFileLock(options: options) {
            try self.migrate(options: options)
          })
        } catch {
          promise.reject("ERR_ZOR_DATABASE_MIGRATION", error.localizedDescription, error)
        }
      }
    }
  }

  private func databaseDirectory() throws -> URL {
    if let group = Bundle.main.object(forInfoDictionaryKey: "ReactNativeQuickSQLite_AppGroup") as? String,
       !group.isEmpty,
       let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) {
      return container
    }
    guard let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
      throw migrationError("Documents directory unavailable")
    }
    return documents
  }

  private func withFileLock<T>(options: MigrationOptions, body: () throws -> T) throws -> T {
    let lockURL = try databaseDirectory().appendingPathComponent(try required(options.lock, "lock"))
    let fd = Darwin.open(lockURL.path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
    guard fd >= 0 else { throw migrationError("Could not open migration lock") }
    defer { Darwin.close(fd) }
    guard flock(fd, LOCK_EX) == 0 else { throw migrationError("Could not acquire migration lock") }
    defer { flock(fd, LOCK_UN) }
    return try body()
  }

  private func migrate(options: MigrationOptions) throws -> [String: Any] {
    let directory = try databaseDirectory()
    let source = directory.appendingPathComponent(try required(options.source, "source"))
    let destination = directory.appendingPathComponent(try required(options.destination, "destination"))
    let temporary = directory.appendingPathComponent(try required(options.temporary, "temporary"))
    let files = FileManager.default
    var createdDestination = false
    var createdTemporary = false

    do {
      if files.fileExists(atPath: destination.path) {
        let pending = try validate(destination, requireMetadata: fileSize(destination) > 0)
        try? files.removeItem(at: temporary)
        return result(migrated: false, pending: pending)
      }

      if !files.fileExists(atPath: source.path) {
        var db: OpaquePointer?
        guard sqlite3_open(destination.path, &db) == SQLITE_OK else {
          sqlite3_close(db)
          throw migrationError("Could not create destination database")
        }
        sqlite3_close(db)
        createdDestination = true
        _ = try validate(destination, requireMetadata: false)
        return result(migrated: false, pending: 0)
      }

      let sourcePending = try checkpointAndValidate(source)
      if files.fileExists(atPath: temporary.path) { try files.removeItem(at: temporary) }
      createdTemporary = true
      try copyWithProgress(source: source, destination: temporary)
      try fsyncFileAndDirectory(temporary)

      sendProgress("validate", copied: fileSize(temporary), total: fileSize(temporary))
      let temporaryPending = try validate(temporary, requireMetadata: true)
      guard temporaryPending == sourcePending else { throw migrationError("Pending upload count changed during copy") }

      sendProgress("promote", copied: fileSize(temporary), total: fileSize(temporary))
      guard Darwin.rename(temporary.path, destination.path) == 0 else {
        throw migrationError("Could not atomically promote destination database")
      }
      createdTemporary = false
      createdDestination = true
      try fsyncDirectory(directory)
      let destinationPending = try validate(destination, requireMetadata: true)
      guard destinationPending == sourcePending else { throw migrationError("Pending upload count changed after promotion") }

      try files.removeItem(at: source)
      try? files.removeItem(at: URL(fileURLWithPath: source.path + "-wal"))
      try? files.removeItem(at: URL(fileURLWithPath: source.path + "-shm"))
      return result(migrated: true, pending: destinationPending)
    } catch {
      if createdTemporary { try? files.removeItem(at: temporary) }
      if createdDestination { try? files.removeItem(at: destination) }
      throw error
    }
  }

  private func checkpointAndValidate(_ url: URL) throws -> Int {
    sendProgress("checkpoint", copied: 0, total: fileSize(url))
    let busy: Int
    do {
      var db: OpaquePointer?
      guard sqlite3_open_v2(url.path, &db, SQLITE_OPEN_READWRITE, nil) == SQLITE_OK else {
        sqlite3_close(db)
        throw migrationError("Could not open source database")
      }
      defer { sqlite3_close(db) }
      try execute(db, "PRAGMA locking_mode=EXCLUSIVE")
      busy = try scalarInt(db, "PRAGMA wal_checkpoint(TRUNCATE)")
    }
    guard busy == 0 else { throw migrationError("Source WAL checkpoint is busy") }
    return try validate(url, requireMetadata: true)
  }

  private func validate(_ url: URL, requireMetadata: Bool) throws -> Int {
    var db: OpaquePointer?
    guard sqlite3_open_v2(url.path, &db, SQLITE_OPEN_READWRITE, nil) == SQLITE_OK else {
      sqlite3_close(db)
      throw migrationError("Could not open database for validation")
    }
    defer { sqlite3_close(db) }
    guard try scalarText(db, "PRAGMA quick_check") == "ok" else { throw migrationError("SQLite quick_check failed") }
    let tableCount = try scalarInt(db, "SELECT count(*) FROM sqlite_master WHERE type='table'")
    if !requireMetadata && tableCount == 0 { return 0 }
    for table in ["ps_crud", "ps_buckets"] {
      guard try scalarInt(db, "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='\(table)'") == 1 else {
        throw migrationError("Missing PowerSync metadata table \(table)")
      }
    }
    return try scalarInt(db, "SELECT count(*) FROM ps_crud")
  }

  private func copyWithProgress(source: URL, destination: URL) throws {
    FileManager.default.createFile(atPath: destination.path, contents: nil)
    let input = try FileHandle(forReadingFrom: source)
    let output = try FileHandle(forWritingTo: destination)
    defer { try? input.close(); try? output.close() }
    let total = fileSize(source)
    var copied: UInt64 = 0
    sendProgress("copy", copied: copied, total: total)
    while let data = try input.read(upToCount: chunkSize), !data.isEmpty {
      try output.write(contentsOf: data)
      copied += UInt64(data.count)
      sendProgress("copy", copied: copied, total: total)
    }
    try output.synchronize()
  }

  private func fsyncFileAndDirectory(_ url: URL) throws {
    let fd = Darwin.open(url.path, O_RDWR)
    guard fd >= 0 else { throw migrationError("Could not open copied database for fsync") }
    defer { Darwin.close(fd) }
    guard Darwin.fsync(fd) == 0 else { throw migrationError("Could not fsync copied database") }
    try fsyncDirectory(url.deletingLastPathComponent())
  }

  private func fsyncDirectory(_ url: URL) throws {
    let fd = Darwin.open(url.path, O_RDONLY)
    guard fd >= 0 else { throw migrationError("Could not open database directory for fsync") }
    defer { Darwin.close(fd) }
    guard Darwin.fsync(fd) == 0 else { throw migrationError("Could not fsync database directory") }
  }

  private func execute(_ db: OpaquePointer?, _ sql: String) throws {
    guard sqlite3_exec(db, sql, nil, nil, nil) == SQLITE_OK else { throw migrationError("SQLite statement failed") }
  }

  private func scalarInt(_ db: OpaquePointer?, _ sql: String) throws -> Int {
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else { throw migrationError("SQLite query failed") }
    defer { sqlite3_finalize(statement) }
    guard sqlite3_step(statement) == SQLITE_ROW else { throw migrationError("SQLite query returned no row") }
    return Int(sqlite3_column_int64(statement, 0))
  }

  private func scalarText(_ db: OpaquePointer?, _ sql: String) throws -> String {
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else { throw migrationError("SQLite query failed") }
    defer { sqlite3_finalize(statement) }
    guard sqlite3_step(statement) == SQLITE_ROW, let text = sqlite3_column_text(statement, 0) else {
      throw migrationError("SQLite query returned no text")
    }
    return String(cString: text)
  }

  private func fileSize(_ url: URL) -> UInt64 {
    let attributes = try? FileManager.default.attributesOfItem(atPath: url.path)
    return (attributes?[.size] as? NSNumber)?.uint64Value ?? 0
  }

  private func sendProgress(_ phase: String, copied: UInt64, total: UInt64) {
    sendEvent("onDatabaseMigrationProgress", [
      "phase": phase,
      "bytesCopied": Double(copied),
      "totalBytes": Double(total),
    ])
  }

  private func result(migrated: Bool, pending: Int) -> [String: Any] {
    ["databaseName": "zor.db", "migrated": migrated, "integrity": "ok", "pendingUploadRows": pending]
  }

  private func required(_ value: String, _ name: String) throws -> String {
    guard !value.isEmpty else { throw migrationError("Missing migration option \(name)") }
    return value
  }

  private func migrationError(_ message: String) -> NSError {
    NSError(domain: "ZorDatabaseFiles", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
  }
}
