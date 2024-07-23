const $ = (query) => query.includes('.') ? Array.from(document.querySelectorAll(query)) : document.querySelector(query);

function UUID() {
    const minID = 1000000000;
    const maxID = 9999999999;
    let ID = `UUID-${Math.floor(Math.random() * (maxID - minID + 1)) + minID}${new Date().getMilliseconds()}`;
    return ID
}

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
        return console.error("Unable to Load CSS")
    }
    const CSSdata = await CSS.text()

    let hostElement = document.getElementsByTagName('head')[0]

    hostElement.insertAdjacentHTML('beforeend', CSSdata)

}
const banner = () => {
    const script = document.createElement('script')
    script.src = `/templates/js/banner.js`
    document.body.insertAdjacentElement('beforeend', script)
}
const loadDefault = async () => {
    await loadCSS()
    await loadDefaultNavbar();
    banner();
    const info = await fetch('/get/account/info')
    if (!info.ok) {
        alert("Unable to verify your login")
    }
    const userInfo = await info.json()
    console.log(userInfo)

    if (userInfo.loggedIn && userInfo.admin) {
        const [_, _1, navbarlink2] = $('.nav-item');
        navbarlink2.onclick = '';
        navbarlink2.addEventListener('click', async () => {
            const URLreq = await fetch('/get/admin-dashboard-url');
            if (!URLreq.ok) { return alert((await URLreq.json()).status)}
            const URL = (await URLreq.json()).data
            console.log(URL)
            location.href = `${URL}`
        });
        navbarlink2.innerHTML = "Admin Dashboard";
    }
    if (!userInfo.loggedIn) {
        const [_, navbarlink1, navbarlink2] = $('.nav-item');
        navbarlink1.onclick = '';
        navbarlink2.onclick = '';
        navbarlink1.addEventListener('click', () => { location.href = '/login' });
        navbarlink2.addEventListener('click', () => { location.href = '/register' });
        navbarlink1.innerHTML = "Login";
        navbarlink2.innerHTML = "Register";

    };
}
loadDefault()

