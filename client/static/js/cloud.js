'use strict';
// The Script must use the defer Attribute otherwise it won't work
// Other

let clipBoard = []

// functions

function getUserID() {
    let userId;
    if (structuredClone(location.href).endsWith('u') || structuredClone(location.href).endsWith('u/')) {
        userId = 'u'
    } else if (location.href.includes('shared' || 'shared/')) {

    }
    return userId
}
async function loadFiles(path) {
    const filesSection = $('#filesection', false)
    filesSection.innerHTML = ''
    const userId = getUserID()
    const options = {
        method: 'GET',
        headers: {
            path: path
        }
    }
    const request = await fetch(`/cloud/files/${userId}`, options)
    if (!request.ok) { return alert("Unable to Load Files") }
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
                <img src="${(type !== 'directory') ? '/assets/images/icons/file/txt.png' : '/assets/images/icons/light/folder.svg'}" alt="">
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
}
// Action Functions
function preview(fileURL) {
    const previewWindow = $('#previewWindow');
    const previewElement = $('#preview');
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
async function download(dataset) {
    if (dataset.type !== 'file') { return alert("You can only Downloads Files") }
    const userId = getUserID()

    const options = {
        method: 'GET',
        headers: {
            path: dataset.path,
            action: 'open'
        }
    }

    const request = await fetch(`/cloud/files/actions/${userId}`, options)
    if (!request.ok) { return alert("Unable to Download The Files") }

    const File = await request.blob()

    const fileURL = URL.createObjectURL(File)

    const link = document.createElement('a');
    link.href = fileURL;
    document.body.appendChild(link)
    link.download = dataset.name

    link.click()
    document.body.removeChild(link)
}
function copy(){
    const selectedFiles = Array.from($("#filesection > .file[data-selected='true']", true))
    if(selectedFiles.length <= 0){ return null }

    clipBoard = [];

    selectedFiles.forEach(file=>{
        clipBoard.push(file.dataset.path)
    })
    console.log(clipBoard)
}
async function paste(){
    if(clipBoard.length <= 0){ return null }

    console.log(clipBoard)
}
async function open(dataset) {
    if (dataset.type === 'directory') {
        loadFiles(dataset.path)
    } else if (dataset.type === 'file') {
        const userId = getUserID()

        const options = {
            method: 'GET',
            headers: {
                path: dataset.path,
                action: 'open'
            }
        }

        const request = await fetch(`/cloud/files/actions/${userId}`, options)
        if (!request.ok) { return alert("Unable to Open The File") }

        const File = await request.blob()

        const fileURL = URL.createObjectURL(File)
        preview(fileURL)
    }
}
async function deletes(dataset) {
    const userId = getUserID()

    const options = {
        method: 'GET',
        headers: {
            path: dataset.path,
            type: dataset.type,
            action: 'delete'
        }
    }

    const request = await fetch(`/cloud/files/actions/${userId}`, options)
    if (!request.ok) { return alert("Unable to Load The Files") }

    const File = await request.json()

    loadFiles($('#directoryInputBar').dataset.path)
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
    const UploadReponse = await UploadRequest.json();

    console.log({ Meta: UploadRequest })
    console.log({ Reponse: UploadRequest })
})
uploadOpenWindowBtn.addEventListener('click', () => {
    // Uploading
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
        if (fileElements.length < 1) { return null }

        if (btn.id === 'open') {
            // Opening File/Directory
            open(fileElements[0].dataset)
        } else if (btn.id === 'copy'){
            copy()
        } else if (btn.id === 'paste'){
            paste()
        } else if (btn.id === 'download') {
            // Download Every one of them
            fileElements.forEach((fileElement) => {
                download(fileElement.dataset);
            })
        } else if (btn.id === 'delete') {
            // Deleting Every one of them
            fileElements.forEach((fileElement) => {
                deletes(fileElement.dataset);
            })
        }
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