const UI = {
    errorMSG: (msg: string, title?: string)=>{
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