const loadContextMenu = async () => {
    const request = await fetch(`/templates/html/contextmenu.html`)
    if (!request.ok) {
        console.error("Unable to Load Context Menu Navbar")
    } else {
        const contextMenuHTML = await request.text()
        $('body').insertAdjacentHTML("beforeend", contextMenuHTML)


        Array.from(document.querySelectorAll('img[src]'))
            .filter(img => img.src.includes(theme.main) && !(img.dataset.const))
            .map(img => {
                img.src = img.src.replace(theme.main, theme.icon)
            });
        window.addEventListener('click', () => {
            $('.contextMenu').forEach(menu => {
                menu.style.display = 'none'
            })
        })

        const fileContextMenuButtons = $('#fileContextMenu > .contextMenu')

        for(let i = 0; i<fileContextMenuButtons.length; i++){
            fileContextMenuButtons[i].addEventListener('click', (event)=>{
                console.log("Clicked")

                if(contextMenuConfig !== undefined && contextMenuConfig !== null){
                    console.log("CONFIG FOUND!")
                    contextMenuConfig(event, fileContextMenuButtons[i].dataset.action)
                }
            })
        }
        const explorerContextMenuButtons = $('#explorerContextMenu > .contextMenu')

        for(let i = 0; i<explorerContextMenuButtons.length; i++){
            explorerContextMenuButtons[i].addEventListener('click', (event)=>{
                console.log("Clicked")

                if(contextMenuConfig !== undefined && contextMenuConfig !== null){
                    console.log("CONFIG FOUND!")
                    contextMenuConfig(event, explorerContextMenuButtons[i].dataset.action)
                }
            })
        }
    }
}

function showContextMenu(event, menu) {
    event.preventDefault();
    $('.contextMenu').forEach(menu => {
        menu.style.display = 'none'
    });
    if (menu !== 'fileContextMenu' && menu !== 'explorerContextMenu') {
        throw new Error("Invalid Context Menu")
    }

    const menuElement = $(`#${menu}`);

    menuElement.style.display = 'flex'
    menuElement.style.top = `${Math.min(event.clientY, window.innerHeight - 175)}px`
    menuElement.style.left = `${Math.min(event.clientX, window.innerWidth - 214)}px`
}



loadContextMenu();
console.log("END")