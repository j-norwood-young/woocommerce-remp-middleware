const restify = require('restify');
const port = process.env.NODE_PORT || 8080;
require('dotenv').config();

const WooCommerce_Mapper = require("./libs/woocommerce_mapper");

const woocommerce_mapper = new WooCommerce_Mapper({ user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE, host: process.env.MYSQL_HOST })

var server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.post('/woocommerce/webhook/:action', (req, res) => {
    console.log("POST");
    console.log(req.params.action);
    switch (req.params.action) {
        case "customer-created": 
            woocommerce_mapper.customer_created(req.body);
            break;
        case "customer-updated":
            woocommerce_mapper.customer_updated(req.body);
            break;
        case "order-updated":
            woocommerce_mapper.order_updated(req.body);
            break;
        case "subscription-updated":
            woocommerce_mapper.subscription_updated(req.body);
            break;
        default:
            console.log(req.body);
    }
    res.send("Okay");
});

server.put('/woocommerce/webhook/:action', (req, res) => {
    console.log("PUT");
    console.log(req.params.action);
    console.log(req.body);
    res.send("Okay");
});

server.get('/woocommerce/webhook/:action', (req, res) => {
    console.log("GET");
    console.log(req.params.action);
    console.log(req.query);
    res.send("Okay");
});

server.listen(port, function() {
    console.log('%s listening at %s', server.name, server.url);
});
