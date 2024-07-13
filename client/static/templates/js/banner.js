`<div class="banner c-green withIcon"> <img src="/assets/images/icons/light/done.svg"> Success: </div>
<div class="banner c-red withIcon"> <img src="/assets/images/icons/light/error_outline.svg"> Error: Stack Overflow </div>
<div class="banner c-yellow withIcon"> <img src="/assets/images/icons/dark/warning_outline.svg" data-const="true"> Warning: Something Might Happen! </div>
<div class="banner c-blue withIcon"> <img src="/assets/images/icons/light/error_outline.svg"> Info: Test </div>`

const Banners = {
    success: msg=>`<div class="banner c-green withIcon"> <img src="/assets/images/icons/light/done.svg"> Success: ${msg} </div>`,
    error: msg=>`<div class="banner c-red withIcon"> <img src="/assets/images/icons/light/error_outline.svg"> Error: ${msg} </div>`,
    warning: msg=>`<div class="banner c-yellow withIcon"> <img src="/assets/images/icons/dark/warning_outline.svg" data-const="true"> Warning: ${msg} </div>`,
    info: msg=>`<div class="banner c-blue withIcon"> <img src="/assets/images/icons/light/error_outline.svg"> Info: ${msg} </div>`,
}
const killbyID = (UUID)=>{
    const Element = $(`#${UUID}`)
    Element.remove()
}
document.body.insertAdjacentHTML('afterbegin', `<div id="floatBannerContainer" style="display:none;"></div>`)
const floatBannerContainer = document.getElementById("floatBannerContainer")

const displaybanner = (banner, msg, timeout=5)=>{
    if(floatBannerContainer.style.display === 'none'){
        floatBannerContainer.style.display = 'flex'
    }


    const ID = UUID()
    floatBannerContainer.insertAdjacentHTML('beforeend', banner(msg))
    floatBannerContainer.lastElementChild.id = ID
    let kill = true
    floatBannerContainer.lastElementChild.addEventListener('click', ()=>{
        killbyID(ID)
        kill = false
    })

    setTimeout(()=>{
        if(!kill){ return null;}
        floatBannerContainer.firstElementChild.style.animation = "banner-slide-out 1s ease-in-out"
    }, (timeout-1)*1000)

    setTimeout(()=>{
        if(!kill){ return null;}

        floatBannerContainer.firstElementChild.remove()
        if(floatBannerContainer.childElementCount < 1){
            floatBannerContainer.style.display = 'none'
        }
    }, timeout*1000)
}