package com.zor.databasefiles

import android.database.sqlite.SQLiteDatabase
import android.system.Os
import android.system.OsConstants
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.util.concurrent.locks.ReentrantLock

class ZorDatabaseFilesModule : Module() {
  companion object {
    private val processLock = ReentrantLock()
    private const val CHUNK_SIZE = 1024 * 1024
  }

  override fun definition() = ModuleDefinition {
    Name("ZorDatabaseFiles")
    Events("onDatabaseMigrationProgress")

    AsyncFunction("ensureReady") { options: Map<String, String> ->
      ensureReadyLocked(options)
    }
  }

  private fun ensureReadyLocked(options: Map<String, String>): Map<String, Any> {
    val context = appContext.reactContext ?: error("React context unavailable")
    val directory = context.filesDir
    val source = File(directory, required(options, "source"))
    val destination = File(directory, required(options, "destination"))
    val temporary = File(directory, required(options, "temporary"))
    val lockFile = File(directory, required(options, "lock"))

    processLock.lock()
    try {
      RandomAccessFile(lockFile, "rw").channel.use { channel ->
        channel.lock().use {
          return migrate(source, destination, temporary)
        }
      }
    } finally {
      processLock.unlock()
    }
  }

  private fun migrate(source: File, destination: File, temporary: File): Map<String, Any> {
    var destinationCreated = false
    var temporaryCreated = false
    try {
      if (destination.exists()) {
        val pending = validate(destination, requireMetadata = destination.length() > 0)
        if (temporary.exists()) temporary.delete()
        return result(false, pending)
      }

      if (!source.exists()) {
        SQLiteDatabase.openOrCreateDatabase(destination, null).close()
        destinationCreated = true
        validate(destination, requireMetadata = false)
        return result(false, 0)
      }

      val sourcePending = checkpointAndValidateSource(source)
      if (temporary.exists() && !temporary.delete()) error("Could not remove stale temporary database")
      temporaryCreated = true
      copyWithProgress(source, temporary)
      fsyncFileAndDirectory(temporary)

      sendProgress("validate", temporary.length(), temporary.length())
      val temporaryPending = validate(temporary, requireMetadata = true)
      check(temporaryPending == sourcePending) { "Pending upload count changed during copy" }

      sendProgress("promote", temporary.length(), temporary.length())
      Os.rename(temporary.absolutePath, destination.absolutePath)
      temporaryCreated = false
      destinationCreated = true
      fsyncDirectory(destination.parentFile ?: error("Database parent missing"))
      val destinationPending = validate(destination, requireMetadata = true)
      check(destinationPending == sourcePending) { "Pending upload count changed after promotion" }

      source.delete()
      File(source.absolutePath + "-wal").delete()
      File(source.absolutePath + "-shm").delete()
      return result(true, destinationPending)
    } catch (error: Throwable) {
      if (temporaryCreated) temporary.delete()
      if (destinationCreated) destination.delete()
      throw error
    }
  }

  private fun checkpointAndValidateSource(file: File): Int {
    sendProgress("checkpoint", 0, file.length())
    val db = SQLiteDatabase.openDatabase(file.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)
    try {
      db.execSQL("PRAGMA locking_mode=EXCLUSIVE")
      db.rawQuery("PRAGMA wal_checkpoint(TRUNCATE)", null).use { cursor ->
        check(cursor.moveToFirst() && cursor.getInt(0) == 0) { "Source WAL checkpoint is busy" }
      }
    } finally {
      db.close()
    }
    return validate(file, requireMetadata = true)
  }

  private fun validate(file: File, requireMetadata: Boolean): Int {
    val db = SQLiteDatabase.openDatabase(file.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)
    try {
      db.rawQuery("PRAGMA quick_check", null).use { cursor ->
        check(cursor.moveToFirst() && cursor.getString(0) == "ok") { "SQLite quick_check failed" }
      }
      val tableCount = db.rawQuery("SELECT count(*) FROM sqlite_master WHERE type='table'", null).use {
        check(it.moveToFirst())
        it.getInt(0)
      }
      if (!requireMetadata && tableCount == 0) return 0
      for (table in listOf("ps_crud", "ps_buckets")) {
        val exists = db.rawQuery(
          "SELECT count(*) FROM sqlite_master WHERE type='table' AND name=?",
          arrayOf(table),
        ).use { it.moveToFirst() && it.getInt(0) == 1 }
        check(exists) { "Missing PowerSync metadata table $table" }
      }
      return db.rawQuery("SELECT count(*) FROM ps_crud", null).use {
        check(it.moveToFirst())
        it.getInt(0)
      }
    } finally {
      db.close()
    }
  }

  private fun copyWithProgress(source: File, destination: File) {
    val total = source.length()
    var copied = 0L
    sendProgress("copy", copied, total)
    FileInputStream(source).channel.use { input ->
      FileOutputStream(destination).channel.use { output ->
        while (copied < total) {
          val count = input.transferTo(copied, minOf(CHUNK_SIZE.toLong(), total - copied), output)
          check(count > 0) { "Database copy made no progress" }
          copied += count
          sendProgress("copy", copied, total)
        }
        output.force(true)
      }
    }
  }

  private fun fsyncFileAndDirectory(file: File) {
    FileOutputStream(file, true).use { it.fd.sync() }
    fsyncDirectory(file.parentFile ?: error("Database parent missing"))
  }

  private fun fsyncDirectory(directory: File) {
    val fd = Os.open(directory.absolutePath, OsConstants.O_RDONLY, 0)
    try { Os.fsync(fd) } finally { Os.close(fd) }
  }

  private fun sendProgress(phase: String, copied: Long, total: Long) {
    sendEvent(
      "onDatabaseMigrationProgress",
      mapOf("phase" to phase, "bytesCopied" to copied.toDouble(), "totalBytes" to total.toDouble()),
    )
  }

  private fun result(migrated: Boolean, pending: Int) = mapOf(
    "databaseName" to "zor.db",
    "migrated" to migrated,
    "integrity" to "ok",
    "pendingUploadRows" to pending,
  )

  private fun required(options: Map<String, String>, key: String): String =
    options[key]?.takeIf { it.isNotBlank() } ?: error("Missing migration option $key")
}
