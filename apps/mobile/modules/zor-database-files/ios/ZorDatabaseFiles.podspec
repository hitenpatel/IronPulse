Pod::Spec.new do |s|
  s.name           = 'ZorDatabaseFiles'
  s.version        = '1.0.0'
  s.summary        = 'Process-safe Zor PowerSync database migration'
  s.description    = 'Migrates the legacy PowerSync SQLite database before JavaScript consumers mount.'
  s.author         = 'Zor'
  s.homepage       = 'https://zor.hiten-patel.co.uk'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.libraries      = 'sqlite3'
  s.source_files   = '**/*.{h,m,mm,swift}'
end
