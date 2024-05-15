// The Script must use the defer Attribute otherwise it won't work
// Other

let clipBoard = []
let cutlist = []
const imageFileExts = ["jpg", "jpeg", "png", "gif", "bmp", "tif", "tiff", "webp", "svg", "ico", "psd", "ai", "eps", "raw", "cr2", "nef", "orf", "sr2", "arw", "dng"];
const videoFileExts = ["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "m4v", "mpeg", "mpg", "3gp", "3g2", "ogg", "ogv", "ts", "mts", "m2ts", "vob", "swf"];
  
const dirRegex = /[\:\*\?\"\<\>\|]+/g;

String.prototype.sanitizeForPath = function(){
    const sanitizedString = this.replace(dirRegex, '').replace(/\.\.+/g, '').replace(/(\/\/+)|(\\+)/g, '/')
    return sanitizedString; 
}

// functions

function isEqual(baseValue, comparisonValues){
    let oneMatch = false
    for (let i = 0; i < comparisonValues.length; i++) {
        if(baseValue === comparisonValues[i]){
            oneMatch = true
            break;
        }
    }
    return oneMatch
}

function getUserID() {
    let userId;
    if (structuredClone(location.href).endsWith('u') || structuredClone(location.href).endsWith('u/')) {
        userId = 'u'
    } else if (location.href.includes('shared' || 'shared/')) {

    }
    return userId
}
function getIcon (type, name){
    if(type == 'directory') { return '/assets/images/icons/light/folder.svg'}

    const nameComponents = name.split('.')
    const ext = nameComponents[nameComponents.length-1]

    if(isEqual(ext, videoFileExts)){ return '/assets/images/icons/file/video.png'}
    if(isEqual(ext, imageFileExts)){ return '/assets/images/icons/file/picture.png'}


    return '/assets/images/icons/file/txt.png'
}
async function loadFiles(inputPath, loadSelected = false) {
    const filesSection = $('#filesection', false)
    filesSection.innerHTML = ''

    const path = inputPath===''?'/': (inputPath.sanitizeForPath().endsWith('/')? inputPath.sanitizeForPath() : inputPath.sanitizeForPath() + '/')

    const userId = getUserID()
    const options = {
        method: 'GET',
        headers: {
            path: path
        }
    }
    const request = await fetch(`/cloud/files/${userId}`, options)
    if (!request.ok) { return showError("Unable to Load Files") }
    $('#directoryInputBar').value = path
    $('#directoryInputBar').dataset.path = path

    const ReponseObject = await request.json()

    if (ReponseObject.length < 1) {
        filesSection.innerHTML = 'No Files Found'
        return null;
    }

    ReponseObject.forEach(fileObject => {

        const filename = fileObject.name;
        const filepath = fileObject.path;
        const type = fileObject.type;

        filesection.insertAdjacentHTML('beforeend', `
        
        <div class="file" data-path="${filepath}" data-type="${type}" data-name="${filename}" data-selected='false' data-timeout="false">
            <div class="icon">
                <img src="${getIcon(type, filename)}" alt="">
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
                open(file.dataset)
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
    })
    if(loadSelected){
        Array.from(fileElements).forEach(fileElement => {
            fileElement.click()
        })
    }
}
// Action Functions
function preview(fileURL) {
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

}
async function download(fileElements) {

    for (let i = 0; i < fileElements.length; i++) {
        if (fileElements[i].dataset.type !== 'file') { return showError("You can only Downloads Files") }
        const userId = getUserID()

        const options = {
            method: 'POST',
            headers: {
                "Content-Type": 'application/json',
                action: 'open'
            },
            body: JSON.stringify({
                path: fileElements[i].dataset.path,
            })
        }

        const request = await fetch(`/cloud/files/actions/${userId}`, options)
        if (!request.ok) { return showError("Unable to Download The Files") }

        const File = await request.blob()

        const fileURL = URL.createObjectURL(File)

        const link = document.createElement('a');
        link.href = fileURL;
        document.body.appendChild(link)
        link.download = fileElements[i].dataset.name

        link.click()
        document.body.removeChild(link)   
    }
}
function cut(){
    const selectedFiles = Array.from($("#filesection > .file[data-selected='true']", true))
    if(selectedFiles.length <= 0){ return null }

    clipBoard.length = 0;
    cutlist.length = 0;

    selectedFiles.forEach(file=>{
        cutlist.push({name: file.dataset.name, path: file.dataset.path})
    })
    console.log(cutlist)
}
function copy(){
    const selectedFiles = Array.from($("#filesection > .file[data-selected='true']", true))
    if(selectedFiles.length <= 0){ return null }

    clipBoard.length = 0;
    cutlist.length = 0;

    selectedFiles.forEach(file=>{
        clipBoard.push(file.dataset.path)
    })
    console.log(clipBoard)
}
async function paste(){
    console.log("Paste Called")
    const userId = getUserID()
    if(clipBoard.length < 1 && cutlist.length < 1){ return null }

    const destination = $('#directoryInputBar').dataset.path
    
    if(cutlist.length>0){
        cutlist.forEach(async ({name, path})=>{
            const options = {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    'action': 'move'
                },
                body: JSON.stringify({
                    from: path,
                    destination: destination + name,
                })
            }
            const request = await fetch(`/cloud/files/actions/${userId}`, options)
            if (!request.ok) { return showError("Unable to Move your Files!") }
    
            const reponse = await request.json()
        })
    } else {
        clipBoard.forEach(async filePath=>{
            console.log(filePath)
            console.log(destination)
            const options = {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    'action': 'copy'
                },
                body: JSON.stringify({
                    from: filePath,
                    destination: destination,
                })
            }
            const request = await fetch(`/cloud/files/actions/${userId}`, options)
            if (!request.ok) { return showError("Unable to Paste your Files!") }
    
            const reponse = await request.json()
        })
    }

    loadFiles($('#directoryInputBar').dataset.path)
}
async function open(dataset) {
    if (dataset.type === 'directory') {
        loadFiles(dataset.path)
    } else if (dataset.type === 'file') {
        const userId = getUserID()

        const options = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                'action': 'open'
            },
            body: JSON.stringify({
                path: dataset.path,
            })
        }
        const request = await fetch(`/cloud/files/actions/${userId}`, options)
        if (!request.ok) { return showError("Unable to Open The File") }

        const File = await request.blob()

        const fileURL = URL.createObjectURL(File)
        preview(fileURL)
    }
}
async function deletes(FileElements) {
    const userId = getUserID()

    for(let i = 0; i<FileElements.length; i++){
        const options = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                'action': 'delete'
            },
            body: JSON.stringify({
                path: FileElements[i].dataset.path,
                type: FileElements[i].dataset.type,
            })
        }
        const request = await fetch(`/cloud/files/actions/${userId}`, options)
        if (!request.ok) { return showError("Unable to Delete your Files") }
        
        const reponse = await request.json()
    }
    $('#filesection').innerHTML = ''
    await loadFiles($('#directoryInputBar').dataset.path)
}
function back(){
    const path = $('#directoryInputBar').dataset.path.sanitizeForPath()
    if (path === '' || path === '/'){ return null }

    const pathComponents = path.split('/')
    const newPath = pathComponents.slice(0, pathComponents.length-(path.endsWith('/')? 2 : 1)).join('/')

    loadFiles(newPath)
}
async function createFile(path, name, data){
    const options = {
        "headers": {
            "Content-Type": "application/json",
	    	'action': 'create-file'
        },
        "referrer": "http://192.168.1.200/cloud/u/",
        "body":JSON.stringify({path: path, name: name, data: data}),
        "method": "POST",
        "mode": "cors"
    }
    const userID = getUserID()
    const request = await fetch(`http://192.168.1.200/cloud/files/actions/${userID}`, options)
    if(!request.ok){ return showError("Unable to Open The File") }
    const reponse = await request.json()
    
    await loadFiles($('#directoryInputBar').dataset.path)
}
async function createFolder(path, name){
    const options = {
        "headers": {
            "Content-Type": "application/json",
	    	'action': 'create-folder'
        },
        "referrer": "http://192.168.1.200/cloud/u/",
        "body":JSON.stringify({path: path, name: name}),
        "method": "POST",
        "mode": "cors"
    }
    const userID = getUserID()
    const request = await fetch(`http://192.168.1.200/cloud/files/actions/${userID}`, options)
    if(!request.ok){ return showError("Unable to Open The File") }
    const reponse = await request.json()
    
    await loadFiles($('#directoryInputBar').dataset.path)
}
function showError(msg){
    alert(msg)
}

loadFiles('/') // Loading All The Files/Folders

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

    const headers = {
        'path': $('#directoryInputBar').dataset.path,
    };
    const options = {
        method: 'POST',
        headers: headers,
        body: formData
    }

    const UploadRequest = await fetch(`/cloud/files/upload/${userID}`, options)
    
    if(!UploadRequest.ok){
        uploadWindowBackground.display = 'none';
        return showError("Unable to Upload Your Files!")
    }
    const UploadReponse = await UploadRequest.json();
    $('#uploadCancel').click()
    await loadFiles($('#directoryInputBar').dataset.path)
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

// Event Listeners
const actionBtns = Array.from($('.actionBtn', true))
actionBtns.forEach(actionBtn => {
    actionBtn.addEventListener('click', ({ target }) => {
        const btn = target.closest('.actionBtn')

        // Every Selected Element
        const fileElements = Array.from($("#filesection > .file[data-selected='true']", true))
        
        console.log(btn.id)
        
        if (btn.id === 'open') {
            if (fileElements.length < 1) { return null }
            // Opening File/Directory
            open(fileElements[0].dataset)
        }
        if (btn.id === 'copy'){ copy() }
        if (btn.id === 'cut'){ cut() }
        if (btn.id === 'paste'){ paste() }
        if (btn.id === 'download') { download(fileElements) }
        if (btn.id === 'delete') { deletes(fileElements) }
        if (btn.id === 'back'){back()}
    })
})

window.addEventListener('keydown', (event) => {
    const fileElements = Array.from($("#filesection > .file[data-selected='true']", true))
    if (fileElements.length < 1) { return null }

    if (event.key === 'Delete') {
        // Deleting Every one of them
        fileElements.forEach((fileElement) => {
            deletes(fileElement.dataset);
        })
    }
})
const directoryInputBar = $('#directoryInputBar')
directoryInputBar.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        loadFiles(event.target.value)
    }
})