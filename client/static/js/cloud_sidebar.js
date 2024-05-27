const sideBarButtons = [
    {
        name: "Home",
        redirect: "/cloud",
        icon: `${theme.colorICO? 'color': theme.icon}/home.svg`
    },
    {
        name: "Drive",
        redirect: "/cloud/u/",
        icon: `${theme.colorICO? 'color': theme.icon}/cloud.svg`
    },
    {
        name: "Shared",
        redirect: "/cloud/shared",
        icon: `${theme.colorICO? 'color': theme.icon}/folder_shared.svg`
    },
    {
        name: "Upload",
        redirect: "/cloud/upload",
        icon: `${theme.colorICO? 'color': theme.icon}/upload.svg`
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