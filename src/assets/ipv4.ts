import 'dotenv/config'
import os from 'os';

let localIP: string | undefined;
const ifaces = os.networkInterfaces();

Object.keys(ifaces).forEach(function (ifname) {
    let alias = 0;

    ifaces[ifname]?.forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
            // Skip over internal (i.e. 127.0.0.1) and non-IPv4 addresses
            return;
        }

        if (ifname === 'Ethernet') {
            if (alias >= 1) {
                // This single interface has multiple IPv4 addresses
                // console.log(ifname + ':' + alias, iface.address);
            } else {
                // This interface has only one IPv4 address
                // console.log(ifname, iface.address);
            }
            ++alias;
            localIP = iface.address;
        }
    });
});

export default localIP || '127.0.0.1'