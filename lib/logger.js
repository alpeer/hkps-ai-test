import LogstashTransport from "winston-logstash/lib/winston-logstash-latest"
import winston from "winston"

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new LogstashTransport({
      host: 'your-logstash-host', // Your Logstash server IP or hostname
      port: 5000,
      protocol: 'tcp',
      node_name: 'HKPS Cervice'
    })
  ]
})

export default logger