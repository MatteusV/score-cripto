import Config

config :logger, level: :info

config :logger, :default_handler,
  formatter: {LoggerJSON.Formatters.BasicLogger, metadata: :all}
