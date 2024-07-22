
## About

This is an Open-Source Self Cloud File Hosting Application which can be used to Self Host your own File Hosting Services

IMPORTANT NOTE: This Application is Still Under Heavy Development if you may encounter some bugs please report them to me.

## Tech Stack

This Application is built with The Following:

FrontEnd: Plain HTML/CSS

Backend: Node.js, TypeScript, Express.js

Database: MongoDB

## Windows

The Docker Method of Installation is the Easiest Method to Run this Application

### Install Docker:

Windows Installation Tutorial Video: https://www.youtube.com/watch?v=5nX8U8Fz5S0

Go to The Official Site of Docker Desktop and Click the Download Button:
https://www.docker.com/products/docker-desktop/

When The Download is Complete Open up the Installer and Install it
### Main Setup

once the Docker Desktop is Installed on your Local System, we can proceed onto the actual installation of this application


Step 1: Scroll up this [Web Page](https://github.com/FlytoTheSpace/cloud) and Click on Green "Code" Button, a drop down menu will appear and click the "Download Zip" Button, and The Download will start

Step 2: Once Downloaded Unzip The Application and Place it Somewhere you like

Step 3: Open up the Unzipped Folder and open up `docker-run.sh` file It'll start the Application

Step 4: Now Your Application should be accessable on http://127.0.0.1:8080

Step 5: go to http://127.0.0.1:8080/register to make an account

## Debian Based (Ubuntu, Mint, PopOS etc.)
Open up terminal and Paste the Following Commands in the Terminal:

Install Docker and It
```bash
sudo apt-get install docker.io docker-compose git
```
Install The Program
```bash
git clone https://github.com/FlytoTheSpace/cloud && cd ./cloud
```
Run It:
```
sudo bash ./docker-run.sh
```

You will see a URL something like "http://127.0.0.1:8080" or "https://192.168.1.12" in The Terminal, Open it Up, A website should appear click on "Register" and make an Account, The First Account will Have Admin by Default and the rest of the users will have a normal role "member".

All in one Command Copy and Paste:
```bash
sudo apt-get install docker.io docker-compose git
git clone https://github.com/FlytoTheSpace/cloud && cd ./cloud
sudo bash ./docker-run.sh
```



# Config.json

1. `devMode`: Enables Development Mode, Disables BrowserOnStart since the server will restart several times during development and enables some extra logs

    - Default: `false`
    - Values: `true` or `false`

2. `databaseDir`: This is the Most important config, It let's you store The Received Data at a Specific Destination
    
    - Default: `$ROOT/database/`
    - `$ROOT`: Correspondes to The ROOT of The Application
    - Value: `PATH`

3. `firstrun`: This is The Most Dangerous Config, It's not advised to change it Manually since it gives the Next Account Registered on The Website The `admin` role.
    
    - Set to `true` by default When fetched from The Repository
    - becomes `false` when an Account is registered
    - Values: `true` or `false`

4. `namesizelimit`: File Name Size Limit

    - Default: `255`
    - Values: `Number (Integer)`

5. `BrowserOnRun`: Simply Open up The Default Browser on Run (Windows Only)

    - Default: `true`
    - Values: `true` or `false`