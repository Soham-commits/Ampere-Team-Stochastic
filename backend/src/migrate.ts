import './env'
import { connect, migrate } from './store/pg'

const sql = connect()
await migrate(sql)
await sql.end()
