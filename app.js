"use strict"
const Docker = require('dockerode');
const dns = require('native-node-dns');
const { networkInterfaces } = require('os');

const dockerSock = new Docker({
  socketPath: process.env.DOCKER_SOCK_PATH || '/var/run/docker.sock'
});

const dockerContainersDbMap = {};
const refreshDockerAddresses = () => {
  dockerSock.listContainers().then(containersList => {
    containersList
      .filter(container => container.State === 'running')
      .map(containerInfo => {
        for(const networksIndex in containerInfo.NetworkSettings.Networks){
          const ipAddress = containerInfo.NetworkSettings.Networks[networksIndex].IPAddress;
          for(const containerInfoIndex in containerInfo.Names){
            const name = containerInfo.Names[containerInfoIndex].substring(1);
            // duno why, but the library return an array of names for each container, and all starting with a slash at the beginning so, it is what it is !!
            if(!dockerContainersDbMap[name]){
              console.log(`Found a container ${containerInfo.Names.map(name => name.substring(1)).join(', ')}`);
              dockerContainersDbMap[name] = [];
            }
            if(dockerContainersDbMap[name].indexOf(ipAddress) === -1){
              dockerContainersDbMap[name].push(ipAddress);
            }
          }
        }
      });
  })
  .catch(console.error);
}
refreshDockerAddresses();
setInterval(refreshDockerAddresses, parseInt(process.env.AUTO_REFRESH_INTERVAL || 5000));

const server = dns.createServer();

server.on('request', async (req, res) => {
  for(const question of req.question){
    if(!dockerContainersDbMap[question.name] || question.type.toString() !== '1'){
      console.warn(`Querying remote resolver to get response for ${question.name} of type ${dns.consts.QTYPE_TO_NAME[question.type]}`);
      const remoteAnswers = await remoteLookup(question);
      for(const remoteAnswer of remoteAnswers){
        const type = dns[dns.consts.QTYPE_TO_NAME[question.type]];
        for(const answer of remoteAnswer.answer){
          res.answer.push(type(answer));
        }
      }
      continue;
    }
    dockerContainersDbMap[question.name].map(ipAddress => {
      res.answer.push(dns.A({
        name: question.name,
        address: ipAddress,
        ttl: 600,
      }));
    });
  }
  res.send();
});

server.on('error', console.error);

server.on('listening', () => {
  const nets = networkInterfaces();
  console.log(`You can try one of these addresses to see which one works for you :`)
  for(const i in nets){
    for(const details of nets[i]){
      console.log(`\t${details.address}`);
    }
  }
});

server.on('close', () => {
  server.serve(parseInt(process.env.DNS_LISTEN_PORT || 53));
});

server.serve(parseInt(process.env.DNS_LISTEN_PORT || 53));

const remoteLookup = async (question) => {
  return new Promise((resolve, reject) => {
    const answers = [];
    var remoteReq = dns.Request({
      question: question,
      server: { address: process.env.REMOTE_RESOLVER_ADDR || `1.1.1.1`, port: process.env.REMOTE_RESOLVER_PORT || 53, type: 'udp' },
      timeout: 1000,
    });
    remoteReq.on('timeout', () => {
      reject('Timeout in making request');
    });
    
    remoteReq.on('message', (err, answer) => {
      if(err) {
        reject(err);
        return;
      }
      answers.push(answer);
    });
    
    remoteReq.on('end', function () {
      resolve(answers);
    });
    
    remoteReq.send();
  });
}