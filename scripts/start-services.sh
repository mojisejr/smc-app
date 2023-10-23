#! /bin/bash

echo "STARTING SERVICES"
echo "##########"

docker ps &> /dev/null

if [ $? -eq 0 ]
then
	echo "> Docker is running"
	echo "> Starting MQTT container"

	docker compose up -d

	if [ $? -ne 0 ]
	then
		echo "> ERROR: cannot start MQTT"
	fi

	echo "> Starting Node-Red Server"


	node-red

	if [ $? -ne 0 ]
	then
		echo "> ERROR: cannot start node-red"
	fi

	echo "> All services is completed up online"
else
	echo "> ERROR starting Services"
fi
