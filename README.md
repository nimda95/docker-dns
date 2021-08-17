# Docker DNS
## What is it ?
This is a simple container written to resolve containers IPs and be just like any other DNS resolver (but locally).
## How it works ?
It will simply try to to map all the **running** containers to their IP addresses (including himself)
## Why ?
I was tired of always needing to find the IP address of the gazillion containers I manage.
Updating the `/etc/hosts` file was not an option for me, as I want that mapping on my phone too, and I access them using VPN (thanks [pritunl](https://pritunl.com/)).
## Warning !!
This is just a personal tool, this was never tested for production

## Installation

### Build the image from this repository
```bash
git clone https://github.com/nimda95/docker-dns.git
docker build -t \<local-name-for-this-image-build\> .
```
### Pull from [docker hub](https://hub.docker.com)
Not yet deployed to docker hub (didn't have time yet)

## Usage

### Default `docker run` (linux)
```bash
docker run -d -v /var/run/docker.sock:/var/run/docker.sock --name docker-dns docker-dns
docker logs -f docker-dns #just to get the usable IPs to be used
```
Choose from from the IPs  that are displayed in the logs and add the suitable one for your setup to your `/etc/resolv.conf` as follows `nameserver 172.16.0.1` (I put it on top of the other nameservers)
### Available env variables

You can customize this image to your environment by changing these env variables 

| Name                  |Description                                                   |Default Value|
|-----------------------|--------------------------------------------------------------|-------------|
|`AUTO_REFRESH_INTERVAL`|Time in milliseconds to refresh the list of running containers|`5000`       |
|`DNS_LISTEN_PORT`      |Port for the DNS to listen on                                 |`53`         |

## Help
PRs are welcome.


