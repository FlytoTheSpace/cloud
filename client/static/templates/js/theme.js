function getAllCookies(){
    const Cookies = document.cookie.replace(/[ ]+/g, '').split(';').map(keyVal=>{
        const [key, val] = keyVal.split('=')
        const obj = {}
        obj[key] = val
        return obj
    })
    return Cookies
}
function getCookie(name){
    const Cookies = document.cookie.replace(/[ ]+/g, '').split(';')
    for (const cookie of Cookies){
        const [key, val] = cookie.split('=')
        if(key === name){
            return val
        }
    }
    return null
}
const theme = {
    main: "dark",
    colorICO: true,
    icon: "light"
}
const cookieTheme = getCookie('theme')
if(cookieTheme){
    theme.main = cookieTheme
    theme.icon = (cookieTheme === 'light')?'dark':'light'
} else {
    document.cookie = `theme=${theme.main}`
}

const themeElement = document.createElement('link');
themeElement.rel = 'stylesheet';
themeElement.href = `/templates/css/theme/${theme.main}.css`;
document.getElementsByTagName('head')[0].insertAdjacentElement('beforeend', themeElement)

window.addEventListener('DOMContentLoaded', ()=>{
    (Array.from(document.querySelectorAll('img[src]')))
        .filter(img=>img.src.includes(theme.main) && !(img.dataset.const))
        .map(img=>{
            img.src = img.src.replace(theme.main, theme.icon)
        })
})