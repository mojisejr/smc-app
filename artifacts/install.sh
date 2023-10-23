#! /bin/bash

#Setup Configuration
mqtt_serv_path="docker-compose.yml"
mqtt_config_path="mosquitto/config/mosquitto.conf"
flow_path="nodered/flow.json"
application_path="auto-drug-cart-1.0.0-arm64.AppImage"
db_path="db/slot.db"
NODE_MAJOR=18


echo "##########"
echo "Starting Smart Medication Cart .."
echo "##########"

#Update Dependencies of RPI
echo "=> Global: global dependencies updates"
sudo apt update &> /dev/null

#NodeJs Installation and Dependencies Dowload
#For Node-red server that runs on RPI. It needs to install nodejs from source
#here: https://github.com/nodesource/distributions/blob/master/README.md
echo ""
echo "##########"
echo "NodeJs Initialization"
echo "##########"

node -v &> /dev/null

if [ $? -ne 0 ]
then
    echo "=> NodeJs: No NodeJs installed"
    echo "=> NodeJs: try to install nodejs on the machine"
    echo "=>=> Nodejs: Download Nodesorce GPG key"
    sudo apt-get install -y ca-certificates curl gnupg
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "=>=> NodeJs: Create ded dependencies"
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list 

    echo "=>=> NodeJs: update global dependencies again.." 
    sudo apt update &> /dev/null

    echo "==> NodeJs: installing nodejs"
    sudo apt install nodejs -y 
    
else
    echo "=> NodeJs: NodeJs installed"
fi


#Docker Container Service
echo ""  
echo "##########"
echo "Docker Service Initialization"
echo "##########"

echo "=> Docker: checking installation"
sudo docker ps &> /dev/null

if [ $? -ne 0 ]
then
    echo "=>=> Docker: no docker installed.."
    echo "=>=> Docker: try to install docker on the machine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh

    sudo docker ps &> /dev/null

    if [ $? -ne 0]
    then
        echo "=>=>=> Docker-Error: cannot install docker on this machine, try to install manually."
    fi
else
    echo "=>=> Docker: found docker installed.."
    echo "=>=> Docker: check MQTT config file..."
    
    ls $mqtt_config_path

    if [ $?  -ne 0 ]
    then
        echo "=>=>=> Docker: MQTT config file not found ..."
    else
        echo "=>=> Docker: MQTT config file existed!..."
        echo "=>=> Docker: check docker-compose file..."
        
        ls $mqtt_serv_path
        
        if [ $? -eq 0 ]
        then
            echo "=>=> Docker: docker-compose file founded"
            echo "=>=> Docker: start service"
            sudo docker compose up -d 
         else
            echo "=>=>=> Docker: docker compose file does not exists"
        fi 
    
    
    fi
fi

#Node-Red Server Serivice
echo ""
echo "##########"
echo "NODE-RED Initialization"
echo "##########"

echo "=> NODE-RED: checking installation"
node-red --help  &> /dev/null

if [ $? -ne 0 ]
then
    echo "=>=> NODE-RED: no node red installed.."
    echo "=>=> NODE-RED: try to install node-red on the machine..."
    bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/deb/update-nodejs-and-nodered)
    
    if [ $? -ne 0]
    then
        echo "=>=> NODE-RED: error cannot install node-red on this machine, try to install manually."
    fi
else 
    echo "=>=> NODE-RED: found node-red installed" 
    echo "=>=> NODE-RED: check flow.json"
    
    ls $flow_path &> /dev/null
    
    if [ $? -ne 0 ]
    then
        echo "=>=> NODE-RED: flows.json existed"
        echo "=>=> NODE-RED: starting node-red"
        sudo systemctl enable nodered.service 
        sudo systemctl start nodered.service
    else
        echo "=>=> NODE-RED: flows.json not found contact dev." 
    fi 
fi

#Database
echo ""
echo "##########"
echo "Database Initialization"
echo "##########"

echo "=> Database: database checking installation"
if test -f "$db_path";
then
    echo "=> Database: database file already created"
else
    echo "=> Database: database file not found, please install database file"
fi


#Application Service
echo ""
echo "##########"
echo Starting GUI
echo "##########"

echo "=> GUI: gui executable file checking"

if test -f "$application_path";
then
    sudo ./$application_path
else
    echo "==> GUI: application image not found"
fi


