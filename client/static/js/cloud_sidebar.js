const sideBarButtons = [
    {
        name: "Home",
        redirect: "/cloud",
        icon: `${theme.colorICO ? 'color' : theme.icon}/home.svg`
    },
    {
        name: "Drive",
        redirect: "/cloud/u/",
        icon: `${theme.colorICO ? 'color' : theme.icon}/cloud.svg`
    },
    {
        name: "Shared",
        redirect: "/cloud/shared",
        icon: `${theme.colorICO ? 'color' : theme.icon}/folder_shared.svg`
    },
    {
        name: "Upload",
        redirect: "/cloud/upload",
        icon: `${theme.colorICO ? 'color' : theme.icon}/upload.svg`
    }
]

const sidebar = document.getElementById('sidebar');
sideBarButtons.forEach(link => {
    sidebar.firstElementChild.insertAdjacentHTML('beforeend', `
        <li onclick="location.href = '${link.redirect}'">
            <img src="/assets/images/icons/${link.icon}" alt="">
            <p class="sidebarLinkText">${link.name}</p>
        </li>
    `)
})
const hideSideBar = document.getElementById('hideSideBar');
const mainContainer = document.getElementById('mainContainer');
const sidebarParagraph = Array.from(document.querySelectorAll('#sidebar p'))

const seconds = 0.3; // Animation Speed (Seconds)

if (hideSideBar) {
    hideSideBar.addEventListener('click', () => {
        const hidden = sidebar.dataset.hidden === 'true' ? true : false;
        if (hidden) {
            sidebar.dataset.hidden = 'false';
            sidebar.style.visibility = 'hidden'
            sidebar.style.animation = `sidebar-slide-in ${seconds}s ease-in`
            mainContainer.style.animation = 'mainContainer-min 0.3s ease-in'
            setTimeout(() => {
                for (let i = 0; i < sidebarParagraph.length; i++) {
                    sidebarParagraph[i].style.visibility = 'visible'
                }
            }, (seconds * (3 / 4)) * 1000)
            setTimeout(() => {
                sidebar.style.display = 'flex'
                sidebar.style.visibility = 'visible'
                mainContainer.style.width = '100%'
            }, seconds * 1000)
            return null
        };

        sidebar.dataset.hidden = 'true'
        sidebar.style.animation = `sidebar-slide-out ${seconds}s ease-in`
        mainContainer.style.animation = `mainContainer-max ${seconds}s ease-in`
        setTimeout(() => {
            for (let i = 0; i < sidebarParagraph.length; i++) {
                sidebarParagraph[i].style.visibility = 'hidden'
            }
        }, (seconds * (1 / 2)) * 1000)
        setTimeout(() => {
            sidebar.style.display = 'none'
        }, seconds * 1000)
        return null;
    })
}
