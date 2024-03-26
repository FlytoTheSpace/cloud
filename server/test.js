import path from "path";
import {exec, execFile} from "child_process";
import ROOT from "./assets/root.js";

exec(`cp -r ${path.join(ROOT, '/server/routes/api.js')} ${path.join(ROOT, '/')}`, (error, stdout, stderr)=>{
    if(error){ console.log("Unable to Copy Files")}
    else {
        console.log("Copies Files Successfully")
    }
})