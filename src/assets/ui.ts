
const ErrorLinks: { [key: string]: Array<[string, string]> } = {
    "Invalid Token": [["/login", "Login"], ["/register", "Register"]],
    "Account Required": [["/login", "Login"], ["/register", "Register"]]
}


const UI = {
    errorMSG: (msg: string, title?: string)=>{
        
        let HTMLinput = ''

        if (ErrorLinks[msg]){
            for(let i = 0; i<ErrorLinks[msg].length; i++){
                HTMLinput += `<button class="fill size-medium c-blue " onclick="location.href = '${ErrorLinks[msg][i][0]}'">${ErrorLinks[msg][i][1]}</button>`
            }
        }

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title? title : msg}</title>
            <script src="/templates/js/default.js"></script>
            <link rel="stylesheet" href="/templates/css/theme/dark.css">
            <style>
                #box{
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                }
            </style>
        </head>
        <body>
            <header>
        
            </header>
            <main>
                <div id="box">
                    <h1>
                        ${msg}
                    </h1>
                    <div>
                        ${HTMLinput}
                    </div>
                </div>
            </main>
            <footer>
        
            </footer>
        </body>
        </html>
        `
    }
}

export default UI