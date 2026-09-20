const path = require('node:path');
const config = require('../../tailwind.config.js');
module.exports = { ...config, content: [path.join(__dirname, 'app/**/*.jsx'), path.join(__dirname, '../../app/_components/SelectField.jsx'), path.join(__dirname, '../../app/_components/form-control-styles.js')] };
