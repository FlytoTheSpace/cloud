
// SETTINGS: DON'T CHANGE THESE IF ACCESSING VIA BROWSER
let GUI = true
const webURL = ''
const ID = null;
const TOKEN = undefined;

// ESSENTIAL (for GUI/CLI)
let clipBoard = []
let cutlist = []
const pathSanitizeRegex = /[\:\*\?\"\<\>\|]+/g;
String.prototype.sanitizePath = function () {
    const sanitizedString = this.replace(pathSanitizeRegex, '').replace(/\.\.+/g, '').replace(/(\/\/+)|(\\+)/g, '/')
    return sanitizedString;
}

// GUI Only
const imageFileExts = ["jpg", "jpeg", "png", "gif", "bmp", "tif", "tiff", "webp", "svg", "ico", "psd", "ai", "eps", "raw", "cr2", "nef", "orf", "sr2", "arw", "dng"];
const videoFileExts = ["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "m4v", "mpeg", "mpg", "3gp", "3g2", "ogg", "ogv", "ts", "mts", "m2ts", "vob", "swf"];

// functions
function isEqual(baseValue, comparisonValues) {
    let oneMatch = false
    for (let i = 0; i < comparisonValues.length; i++) {
        if (baseValue === comparisonValues[i]) {
            oneMatch = true
            break;
        }
    }
    return oneMatch
}

function getUserID() {
    if (!GUI) { return null }
    let userId;
    if (structuredClone(location.href).endsWith('u') || structuredClone(location.href).endsWith('u/')) {
        userId = 'u'
    } else if (location.href.includes('shared' || 'shared/')) {

    }
    return userId
}

const userId = ID ?? getUserID();

const UI = {
    loadFiles: async function (inputPath, loadSelected = false) {
        const filesSection = $('#filesection', false)
        filesSection.innerHTML = ''
        
        const path = inputPath === '' ? '/' : (inputPath.sanitizePath().endsWith('/') ? inputPath.sanitizePath() : inputPath.sanitizePath() + '/')
        
        
        const options = {
            method: 'GET',
            headers: (TOKEN) ? {
                Authorization: TOKEN,
                path: path
            } : {
                path: path
            }
        }
        const request = await fetch(`${webURL}/cloud/files/${userId}`, options)
        if (!request.ok) { return UI.showError((await request.json()).status) }
        $('#directoryInputBar').value = path
        $('#directoryInputBar').dataset.path = path
        
        const ReponseObject = await request.json()
        
        if (ReponseObject.length < 1) {
            filesSection.innerHTML = 'No Files Found'
            return null;
        }
        
        filesSection.innerHTML = ''
        ReponseObject.forEach(fileObject => {
            
            const filename = fileObject.name;
            const filepath = fileObject.path;
            const type = fileObject.type;

            filesection.insertAdjacentHTML('beforeend', `
            
            <div class="file" data-path="${filepath}" data-type="${type}" data-name="${filename}" data-selected='false' data-timeout="false">
                <div class="icon">
                    <img src="${UI.getIcon(type, filename)}" alt="">
                </div>
                <div class="name">${filename.length > 40 ? filename.slice(0, 49) + '..' : filename}</div>
            </div>`

            )
        })
        const fileElements = $('.file', true)
        Array.from(fileElements).forEach(fileElement => {
            fileElement.addEventListener('click', (event) => {
                const file = event.target.closest('.file')
                if (file.dataset.selected === 'true' && file.dataset.timeout === 'true') {
                    // On Double Click on Files/Directory
                    file.dataset.timeout === false
                    UI.open(file.dataset)
                }
                // On Single Click
                else if (file.dataset.selected === 'false') {
                    file.dataset.selected = true
                    file.style.background = 'rgba(91, 115, 183, 0.66)'

                    file.dataset.timeout = true;
                    setTimeout(() => {
                        file.dataset.timeout = false;
                    }, 1 * 1000);
                } else {
                    file.dataset.selected = false
                    file.style.background = 'var(--bold-background)'
                }
            })

            fileElement.addEventListener('contextmenu', (event)=>{
                showContextMenu(event, 'fileContextMenu')
            })
        })
        if (loadSelected) {
            Array.from(fileElements).forEach(fileElement => {
                fileElement.click()
            })
        }
    },
    download: async function (paths, types) {
        if (!paths) { return null }

        const fails = []
        for (let i = 0; i < paths.length; i++) {

            try {
                if (types[i] !== 'file') { return UI.showError("You can only Downloads Files") }
            } catch (error) {
                if (error.message !== "can't access property 0, types is undefined") {
                    console.error(error)
                    return;
                }
            }



            const options = {
                method: 'POST',
                headers: (TOKEN) ? {
                    Authorization: TOKEN,
                    "Content-Type": 'application/json',
                    action: 'open'
                } : {
                    "Content-Type": 'application/json',
                    action: 'open'
                },
                body: JSON.stringify({
                    path: paths[i]
                })
            }

            const request = await fetch(`${webURL}/cloud/files/actions/${userId}`, options)

            if (!request.ok) { fails.push([request.status, paths[i], (await request.clone().json()).status]); continue }

            const File = await request.blob()

            const fileURL = URL.createObjectURL(File)

            const link = document.createElement('a');
            link.href = fileURL;
            document.body.appendChild(link)

            const name = paths[i].replace(/[\\]+/g, '/').sanitizePath().split('/').at(-1)

            link.download = name

            link.click()
            document.body.removeChild(link)
        }

        if (fails.length > 0) { UI.showError(`Unable to download ${fails.length} Files ${fails}`) }

    },
    open: async function (dataset) {
        if (dataset.type === 'directory') {
            UI.loadFiles(dataset.path)
        } else if (dataset.type === 'file') {


            const options = {
                method: 'POST',
                headers: (TOKEN) ? {
                    Authorization: TOKEN,
                    "Content-Type": 'application/json',
                    action: 'open'
                } : {
                    "Content-Type": "application/json",
                    
                    action: 'open'
                },
                body: JSON.stringify({
                    path: dataset.path,
                })
            }
            const request = await fetch(`${webURL}/cloud/files/actions/${userId}`, options)
            if (!request.ok) { return UI.showError((await request.json()).status) }

            const File = await request.blob()

            const fileURL = URL.createObjectURL(File)
            UI.preview(fileURL)
        }
    },
    showError: function (msg) {
        displaybanner(Banners.error, msg)
    },
    preview: function (fileURL) {
        const previewWindow = $('#previewWindow');
        const previewElement = $('#preview'); // Iframe
        const previewCloseButton = $('#previewCloseButton');

        previewWindow.style.display = 'block';
        previewElement.src = fileURL;

        previewElement.addEventListener('load', () => {

            const iframeDOM = previewElement.contentDocument;

            if (theme.main === 'dark') { iframeDOM.body.style.color = 'white' }
            try {
                if (iframeDOM.body.firstElementChild.tagName.toLowerCase() === 'img') {
                    iframeDOM.body.firstElementChild.classList.remove('shrinkToFit')
                    iframeDOM.body.firstElementChild.style.margin = '0 auto'
                }
            } catch (error) { }
        })
        previewCloseButton.onclick = () => {
            URL.revokeObjectURL(fileURL);
            previewElement.src = '';
            previewWindow.style.display = 'none';
        }

    },
    getIcon: function (type, name) {
        if (type == 'directory') { return '/assets/images/icons/light/folder.svg' }

        const nameComponents = name.split('.')
        const ext = nameComponents[nameComponents.length - 1]

        if (isEqual(ext, videoFileExts)) { return '/assets/images/icons/file/video.png' }
        if (isEqual(ext, imageFileExts)) { return '/assets/images/icons/file/picture.png' }


        return '/assets/images/icons/file/txt.png'
    },
    back: function () {
        const path = $('#directoryInputBar').dataset.path.sanitizePath()
        if (path === '' || path === '/') { return null }

        const pathComponents = path.split('/')
        const newPath = pathComponents.slice(0, pathComponents.length - (path.endsWith('/') ? 2 : 1)).join('/')

        UI.loadFiles(newPath)
    }
}

// Functions Compatable for Both GUI and CLI
const Action = {
    /**
     * 
     * @param  {string} path
     * @description Retrieves the File From the Server
     * @returns 
     * @example Action.cut('./foo/file.txt'); Action.paste('./bar/file.txt')
     */
    get: async function (path) {
        const options = {
            method: 'POST',
            headers: (TOKEN) ? {
                Authorization: TOKEN,
                "Content-Type": 'application/json',
                action: 'open'
            } : {
                "Content-Type": "application/json",
                action: 'open'
            },
            body: JSON.stringify({
                path: dataset.path,
            })
        }
        const request = await fetch(`${webURL}/cloud/files/actions/${userId}`, options)
        if (!request.ok) { return new Error((await (request.clone()).json()).status) }

        const File = await request.blob()
        return File
    },
    /**
     * 
     * @param  {...string} paths 
     * @description Adds The File to a Cut-List, call the `Action.paste(destination)` function to actually move the file
     * @returns 
     * @example Action.cut('./foo/file.txt'); Action.paste('./bar/file.txt')
     */
    cut: function (...paths) {
        clipBoard.length = 0;
        cutlist.length = 0;

        const selectedFiles = (GUI && paths.length < 1) ?
            Array.from($("#filesection > .file[data-selected='true']", true)) :
            paths.map(path => {
                const constPath = path.replace(/[\\]+/g, '/').sanitizePath();
                return { dataset: { name: constPath.split('/').at(-1), path: constPath } }
            })

        if (selectedFiles.length <= 0) { return null }

        selectedFiles.forEach(file => {
            cutlist.push({ name: file.dataset.name, path: file.dataset.path })
        })
    },
    /**
     * 
     * @param  {...string} paths 
     * @description Adds The File to a ClipBoard, call the `Action.paste(destination)` function to paste the file
     * @returns 
     * @example Action.copy('./foo/file.txt'); Action.paste('./bar/file.txt')
     */
    copy: function (...paths) {
        clipBoard.length = 0;
        cutlist.length = 0;

        let pathsToPush = []
        if (paths.length > 0) { pathsToPush = paths }
        else {
            const selectedFiles = Array.from($("#filesection > .file[data-selected='true']", true))
            pathsToPush = selectedFiles.map(({ dataset }) => dataset.path.sanitizePath())
        }

        clipBoard.push(...pathsToPush)
    },
    /**
     * 
     * @param  {string} destination 
     * @description Paste/Moves the Files from either Cutlist or ClipBoard depening on last use of them (Cutlist has a higher Priority)
     * @returns 
     * @example Action.copy('./foo/file.txt'); Action.paste('./bar/file.txt')
     */
    paste: async function (destination) {
        if (clipBoard.length < 1 && cutlist.length < 1) { return null }

        const dest = ((GUI && !destination) ? $('#directoryInputBar').dataset.path : destination).sanitizePath();

        if (cutlist.length > 0) {
            cutlist.forEach(async ({ name, path }) => {
                const options = {
                    method: 'POST',
                    headers: (TOKEN) ? {
                        Authorization: TOKEN,
                        "Content-Type": 'application/json',
                        action: 'move'
                    } : {
                        "Content-Type": "application/json",
                        action: 'move'
                    },
                    body: JSON.stringify({
                        from: path.sanitizePath(),
                        destination: (dest + name).sanitizePath(),
                    })
                }
                const request = await fetch(`${webURL}/cloud/files/actions/${userId}`, options)
                if (!request.ok) { return UI.showError((await request.json()).status) }

                const reponse = await request.json()
            })
        } else {
            clipBoard.forEach(async filePath => {
                const options = {
                    method: 'POST',
                    headers: (TOKEN) ? {
                        Authorization: TOKEN,
                        "Content-Type": 'application/json',
                        action: 'copy'
                    } : {
                        "Content-Type": "application/json",
                        action: 'copy'
                    },
                    body: JSON.stringify({
                        from: filePath.sanitizePath(),
                        destination: dest.sanitizePath(),
                    })
                }
                const request = await fetch(`${webURL}/cloud/files/actions/${userId}`, options)
                if (!request.ok) { return UI.showError("Unable to Paste your Files!") }

                const reponse = await request.json()
            })
        }

        await UI.loadFiles($('#directoryInputBar').dataset.path)
    },
    deletes: async function (...paths) {

        const fails = []

        for (let i = 0; i < paths.length; i++) {
            const options = {
                method: 'POST',
                headers: (TOKEN) ? {
                    Authorization: TOKEN,
                    "Content-Type": 'application/json',
                    action: 'delete'
                } : {
                    "Content-Type": "application/json",
                    action: 'delete'
                },
                body: JSON.stringify({
                    path: paths[i]
                })
            }
            const request = await fetch(`${webURL}/cloud/files/actions/${userId}`, options)
            if (!request.ok) { fails.push([request.status, paths[i], (await request.clone().json()).status]); continue }

            const reponse = await request.json()
        }

        if (fails.length > 0) { UI.showError(`Unable to delete ${fails.length} Files ${fails}`) }


        $('#filesection').innerHTML = ''
        await UI.loadFiles($('#directoryInputBar').dataset.path)
    },
    createFile: async function (path, name, data) {
        const options = {
            method: "POST",
            headers: (TOKEN) ? {
                Authorization: TOKEN,
                "Content-Type": 'application/json',
                action: 'create-file'
            } : {
                "Content-Type": "application/json",
                action: 'create-file'
            },
            body: JSON.stringify({ path: path, name: name, data: data }),
            credientals: "includes"
        }
        const userID = getUserID()
        const request = await fetch(`${webURL}/cloud/files/actions/${userID}`, options)
        if (!request.ok) { return UI.showError((await request.json()).status) }
        await request.json()

        await UI.loadFiles($('#directoryInputBar').dataset.path)
    },
    createFolder: async function (path, name) {
        const options = {
            method: "POST",
            headers: (TOKEN) ? {
                Authorization: TOKEN,
                "Content-Type": 'application/json',
                action: 'create-folder'
            } : {
                "Content-Type": "application/json",
                action: 'create-folder'
            },
            body: JSON.stringify({ path: path, name: name }),
        }
        const userID = getUserID()
        const request = await fetch(`${webURL}/cloud/files/actions/${userID}`, options)
        if (!request.ok) { return UI.showError((await request.json()).status) }
        const reponse = await request.json()

        await UI.loadFiles($('#directoryInputBar').dataset.path)
    }
}

const contextMenuConfig = (event, action)=>{
    const fileElements = $("#filesection > .file[data-selected='true']", true)

    const paths = fileElements.map(({ dataset }) => dataset.path)

    if (action === 'open') { UI.open(fileElements[0].dataset) }
    else if (action === 'copy') { Action.copy() }
    else if (action === 'cut') { Action.cut() }
    else if (action === 'paste') { Action.paste() }
    else if (action === 'download') {
        const types = fileElements.map(({ dataset }) => dataset.type)
        UI.download(paths, types)
    }
    else if (action === 'delete') { Action.deletes(...paths) }
    else if (action === 'back') { UI.back() }
    else {
        UI.showError("Action has not been defined yet, Sorry for your Inconvinience")
    }
    
}

// Event Listeners
if (GUI) {
    const directoryInputBar = $('#directoryInputBar')
    directoryInputBar.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            UI.loadFiles(event.target.value)
        }
    })

    UI.loadFiles('/') // Loading All The Files/Folders

    // Upload
    $('#uploadForm').action = `/cloud/files/upload/${getUserID()}`
    const uploadBtn = $('#uploadBtn')
    const uploadOpenWindowBtn = $('#uploadWindowOpenBtn')
    const uploadWindowBackground = $('#uploadWindowBackground')
    uploadBtn.addEventListener('click', async () => {

        const files = $('#uploadInput').files
        const formData = new FormData();
        const userID = getUserID()

        for (const file of files) {
            formData.append('file', file);
        }

        const headers = (TOKEN) ? {
            Authorization: TOKEN,
            'path': $('#directoryInputBar').dataset.path,
        } : {
            'path': $('#directoryInputBar').dataset.path,
        };
        const options = {
            method: 'POST',
            headers: headers,
            body: formData
        }

        const UploadRequest = await fetch(`/cloud/files/upload/${userID}`, options)

        if (!UploadRequest.ok) {
            uploadWindowBackground.display = 'none';
            return UI.showError((await UploadRequest.json()).status)
        }
        const UploadReponse = await UploadRequest.json();
        $('#uploadCancel').click()
        await UI.loadFiles($('#directoryInputBar').dataset.path)
    })
    uploadOpenWindowBtn.addEventListener('click', () => {
        uploadWindowBackground.style.display = 'flex'
    })
    $('#uploadCancel').addEventListener('click', () => {
        // Cancelling Upload
        $('#uploadWindowBackground').style.display = 'none'
        $('#uploadInput').value = ''
        $('#uploadInputLabel').textContent = 'Choose files';
    })
    $('#uploadInput').addEventListener('change', function () {
        const files = this.files;
        const uploadInputLabel = $('#uploadInputLabel');

        if (files.length <= 0) {
            return uploadInputLabel.textContent = 'Choose files';
        }
        const fileNames = `Selected ${Array.from(files).map(file => file.name).join(', ')}`;
        uploadInputLabel.textContent = fileNames;
    });



    const actionBtns = Array.from($('.actionBtn', true))
    actionBtns.forEach(actionBtn => {
        actionBtn.addEventListener('click', ({ target }) => {
            const btn = target.closest('.actionBtn')

            // Every Selected Element
            const fileElements = Array.from($("#filesection > .file[data-selected='true']", true))

            const paths = fileElements.map(({ dataset }) => dataset.path)


            if (btn.id === 'open') {
                if (fileElements.length < 1) { return null }
                // Opening File/Directory
                UI.open(fileElements[0].dataset)
            }
            if (btn.id === 'copy') { Action.copy() }
            if (btn.id === 'cut') { Action.cut() }
            if (btn.id === 'paste') { Action.paste() }
            if (btn.id === 'download') {
                const types = fileElements.map(({ dataset }) => dataset.type)
                UI.download(paths, types)
            }
            if (btn.id === 'delete') { Action.deletes(...paths) }
            if (btn.id === 'back') { UI.back() }
        })
    })



    window.addEventListener('keydown', (event) => {

        if (event.ctrlKey && event.key === 'v') {
            Action.paste(directoryInputBar.dataset.path);
        }
        if (event.ctrlKey && event.key === 'ArrowLeft') {
            UI.back();
        }

        const fileElements = $("#filesection > .file[data-selected='true']", true)
        if (fileElements.length < 1) { return null };
        
        if (event.ctrlKey && event.key === 'c') {
            Action.copy(...fileElements.map(fileElement=>fileElement.dataset.path));
        } else if (event.ctrlKey && event.key === 'x') {
            Action.cut(...fileElements.map(fileElement=>fileElement.dataset.path));
        } else if (event.key === 'Delete') {
            Action.deletes(...fileElements.map(fileElement=>fileElement.dataset.path));
        }
    })



    $('#filesection').addEventListener('contextmenu', (event)=>{
        if(event.target.id === 'filesection'){
            showContextMenu(event, 'explorerContextMenu')
        }
    })
    $('#createFile').addEventListener('click', ()=>{
        const filesection = $('#filesection')
        filesection.insertAdjacentHTML('beforeend', `
            
            <div class="file" data-path="" data-type="" data-name="" data-selected='false' data-timeout="false">
                <div class="icon">
                    <img src="${UI.getIcon('file','')}" alt="">
                </div>
                <div class="name pendingFileCreation" contentEditable='true'>New File</div>
            </div>`

            )
        const pendingFileCreation = $('.pendingFileCreation')[0]
        pendingFileCreation.focus()
        pendingFileCreation.onkeydown = function({key}){
            if(key === 'Enter'){
                const path = $('#directoryInputBar').dataset.path

                Action.createFile(path, (pendingFileCreation.textContent).sanitizePath(), '')
                
                UI.loadFiles($('#directoryInputBar').dataset.path)
            }
        }
    })
    $('#createFolder').addEventListener('click', ()=>{
        const filesection = $('#filesection')
        filesection.insertAdjacentHTML('beforeend', `
            
            <div class="file" data-path="" data-type="" data-name="" data-selected='false' data-timeout="false">
                <div class="icon">
                    <img src="${UI.getIcon('directory')}" alt="">
                </div>
                <div class="name pendingFolderCreation" contentEditable='true'>New Folder</div>
            </div>`

            )
        const pendingFolderCreation = $('.pendingFolderCreation')[0]
        pendingFolderCreation.focus()
        pendingFolderCreation.onkeydown = function({key}){
            if(key === 'Enter'){
                const path = $('#directoryInputBar').dataset.path

                Action.createFolder(path, (pendingFolderCreation.textContent).sanitizePath())
                
                UI.loadFiles($('#directoryInputBar').dataset.path)
            }
        }
    })
}