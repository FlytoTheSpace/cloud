const loadDefaultNavbar = async ()=>{
    const navbar = await fetch(`${location.href}templates/html/navbar.html`)
    if(!navbar.ok){
        console.error("Unable to Load Default Navbar")
    } else {
        const navbarData = await navbar.text()

        let hostElement
        try{
            hostElement = document.getElementsByTagName('header')[0]
            if(!hostElement) throw new Error("Host Doesn't Exist")
        } catch (error) {
            hostElement = document.getElementsByTagName('body')[0]
        } finally{
            hostElement.insertAdjacentHTML("afterbegin",navbarData)
        }
    }
}
const loadCSS = async ()=>{
    const CSS = await fetch(`${location.href}templates/html/css.html`)
    if(!CSS.ok){
        console.error("Unable to Load Default Navbar")
    } else {
        const CSSdata = await CSS.text()

        let hostElement = document.getElementsByTagName('head')[0]

        hostElement.insertAdjacentHTML('beforeend', CSSdata)
    }
}
const loadDefault = async ()=>{
    await loadCSS()
    loadDefaultNavbar();
}

loadDefault()