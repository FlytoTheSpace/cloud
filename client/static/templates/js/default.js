const loadDefaultNavbar = async () => {
    const navbar = await fetch(`/templates/html/navbar.html`)
    if (!navbar.ok) {
        console.error("Unable to Load Default Navbar")
    } else {
        const navbarData = await navbar.text()

        let hostElement
        try {
            hostElement = document.getElementsByTagName('header')[0]
            if (!hostElement) throw new Error("Host Doesn't Exist")
        } catch (error) {
            hostElement = document.getElementsByTagName('body')[0]
        } finally {
            hostElement.insertAdjacentHTML("afterbegin", navbarData)

            const searchBar = document.getElementById('searchBar');
            const navbarCenter = document.getElementById('navbar-center');

            // Add focus and blur event listeners to toggle absolute positioning
            searchBar.addEventListener('focus', function () {
                if (window.innerWidth <= 576) {
                    searchBar.style.position = 'absolute';
                    searchBar.style.width = '90%'; // Set width to 100% when focused
                    searchBar.style.height = '40px'; // Set width to 100% when focused
                    searchBar.style.left = '0';
                    searchBar.style.top = '25px';
                    searchBar.style.transform = 'translateY(-50%)';
                    navbarCenter.style.display = 'flex'; // Change display to flex
                }
            });

            searchBar.addEventListener('blur', function () {
                if (window.innerWidth <= 576) {
                    searchBar.style.width = '100%';
                    searchBar.style.height = '40px'; // Set width to 100% when focused
                    searchBar.style.transform = 'none';
                    searchBar.style.position = 'static';
                    navbarCenter.style.display = 'block'; // Reset display to block
                }
            });


        }
    }
}
const loadCSS = async () => {
    const CSS = await fetch(`/templates/html/css.html`)
    if (!CSS.ok) {
        console.error("Unable to Load CSS")
    } else {
        const CSSdata = await CSS.text()

        let hostElement = document.getElementsByTagName('head')[0]

        hostElement.insertAdjacentHTML('beforeend', CSSdata)
    }
}
const loadDefault = async () => {
    await loadCSS()
    loadDefaultNavbar();
}

(async () => {
    const info = await fetch('/get/account/info')
    if(!info.ok){
        alert("Unable to verify your login")
    }
    const userInfo = await info.json()
})()

loadDefault()