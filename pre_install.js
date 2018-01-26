// use preinstall to install the right node-canvas-bin package
//https://github.com/mauritslamers/node-canvas-builder/releases/download/v1.0r3/osx_0.12.tar.gz
//https://github.com/mauritslamers/node-canvas-builder/releases/download/v1.0rc3/osx_0.12.tar.gz

function installCanvasBin (release) {
  // var release = "v1.0";
  var os = require('os');
  var node_version = process.versions.node.split(".").filter(function (p, i) {
    if (i < 2) {
      return p;
    }
  });
  if (node_version[0] !== '0') {
    node_version[1] = '0';
  }
  node_version = node_version.join(".");

  var arch = os.arch();
  var platform = os.platform();
  var filename;

  switch (platform) {
    case "darwin":
      filename = "osx_" + node_version; break;
    case "linux":
      filename = "linux_" + arch + "_" + node_version; break;
    case "win32":
      filename = "win_" + arch + "_" + node_version; break;
      if (arch === "x64" && node_version === "0.10") {
        throw new Error("This version of the SproutCore buildtools cannot run on 64bit Windows and node 0.10 because of compilation errors.");
      }
  }

  filename += ".tar.gz";

  var base_url = "https://github.com/mauritslamers/node-canvas-builder/releases/download/";
  var url = base_url + release + "/" + filename;


  console.log("Installing canvas-bin for your platform (", platform, ",", arch, ") and node version: ", node_version);
  var spawn = require('child_process').spawn,
      npm   = spawn('npm', ['install', url]);

  // npm.stdout.on('data', function (data) {
  //   console.log('stdout: ' + data);
  // });

  // npm.stderr.on('data', function (data) {
  //   console.log(data);
  // });

  npm.on('close', function (code) {
    if (code === 0) {
      console.log('Successfully installed canvas-bin for your platform');
    }
    else {
      console.log('Error installing canvas-bin for your platform. If you are on an older version of Node,');
      console.log('you can try to fix this by manually installing an older version by providing the pre_install.js')
      console.log('script with a version: node pre_install.js v1.0. If this doesn\'t help you, please report the issue!');
    }
  });
}

console.log('Installing canvas-bin for your platform.');
if (process.argv[2]) {
  console.log('Detected a version as command line option, trying to install ' + process.argv[2]);
  installCanvasBin(process.argv[2]);
}
else {
  console.log('Trying to determine latest version from github.com');
  http.get('https://api.github.com/repos/mauritslamers/node-canvas-builder/releases/latest', (res) => {
    const statusCode = res.statusCode;
    const contentType = res.headers['content-type'];

    let error;
    if (statusCode !== 200) {
      error = new Error('Request Failed.\n' +
                        `Status Code: ${statusCode}`);
    } else if (!/^application\/json/.test(contentType)) {
      error = new Error('Invalid content-type.\n' +
                        `Expected application/json but received ${contentType}`);
    }
    if (error) {
      console.log(error.message);
      // consume response data to free up memory
      res.resume();
      return;
    }

    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => rawData += chunk);
    res.on('end', () => {
      try {
        const parsedData = JSON.parse(rawData);
        // we are interested in the version contained in tag_name
        installCanvasBin(parsedData.tag_name);
      } catch (e) {
        console.log(e.message);
      }
    });
  }).on('error', (e) => {
    console.log(`Unable to install canvas-bin: Got error: ${e.message}. Please report this!`);
  });
}

