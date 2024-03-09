import bcrypt from 'bcrypt'

const hashedPassword = (await bcrypt.hash('123', (await bcrypt.genSalt())))//.toString('hex')

console.log(hashedPassword)

console.log(await bcrypt.compare('123', hashedPassword))