const logPrefix: (filename: string)=> string = (filename: string)=>`[${new Date().toLocaleTimeString()}] [${filename}]`

export default logPrefix