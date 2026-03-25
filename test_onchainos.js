const { exec } = require('child_process');
require('dotenv').config();

const env = {
  ...process.env,
  PATH: `${process.env.USERPROFILE}\\.local\\bin;${process.env.PATH}`,
};

console.log("Running onchainos...");
exec('onchainos signal list --chain xlayer --wallet-type "1,2,3"', { env }, (err, stdout, stderr) => {
  console.log("ERR:", err?.message);
  console.log("STDERR:", stderr);
  console.log("STDOUT:", stdout?.substring(0, 200));
});
