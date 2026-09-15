const config = require("./config");
const app = require("./app");

app.listen(config.port, () => {
  console.log(`BhumiSetu backend running on port ${config.port}`);
});
