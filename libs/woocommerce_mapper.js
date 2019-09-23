const mysql = require("mysql2");

class WooCommerce_Mapper {
    constructor(props) {
        console.log(props);
        this.props = props;
        this.connect(this.props);
    }

    async get_one(table, field, val) {
        let results = await this.mysql.query("SELECT * FROM ?? WHERE ?? = ?", [table, field, val]);
        return (!results[0].length) ? null : results[0][0];
    }

    connect(props) {
        const pool = mysql.createPool({
            host: props.host || 'localhost',
            user: props.user || 'root',
            password: props.password || '',
            database: props.database || 'crm',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        }, (result, err) => {
            if (err) {
                console.log("Error connecting database");
                console.error(err);
                throw(err);
            }
        });
        this.mysql = pool.promise();
        this.test().then(() => {
            console.log("Connected to database");
        }).catch(err => console.log(err));
    }

    async test() {
        await this.mysql.query("SELECT 1").catch(err => { console.log("Failed MySql test"); throw(err) });
    }

    async customer_created(data) {
        if (!data.email) return;
        let sql_data = {
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name,
            public_name: data.username,
            role: "user",
            wp_user_id: data.id,
            active: 1,
            last_sign_in_at: new Date(),
            current_sign_in_at: new Date(),
            created_at: new Date(),
            modified_at: new Date(),
            confirmed_at: new Date(),
        }
        await this.mysql.query("INSERT INTO users SET ?", sql_data).catch(err => {
            console.log("Database error");
            console.error(err);
            return;
        });
        console.log(sql_data);
    }

    async customer_updated(data) {
        if (!data.email) return;
        let sql_data = {
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name,
            public_name: data.username,
            modified_at: new Date(),
        }
        await this.mysql.query("UPDATE users SET ? WHERE wp_user_id=?", [sql_data, data.id]).catch(err => {
            console.log("Database error");
            console.error(err);
            return;
        });
        console.log(sql_data);
    }

    async order_updated(data) {
        if (!data.customer_id) return;
        if (!data.status === "completed") {
            console.log("Order incomplete", data.status);
            return;
        }
        const user = await this.get_one("users", "wp_user_id", data.customer_id);
        if (!user) {
            console.warn("Couldn't find user", data.customer_id);
            return;
        }
        const gateway = await this.get_one("payment_gateways", "code", "payfast");
        const subscription = await this.get_one("subscriptions", "user_id", user.id);
        let sql_data = {
            variable_symbol: +new Date(),
            amount: data.total,
            additional_amount: 0,
            payment_gateway_id: gateway.id,
            subscription_id: subscription.id,
            user_id: user.id,
            status: "paid",
            created_at: new Date(),
            modified_at: new Date(),
            referer: "https://dailymaverick.co.za",
            paid_at: new Date(),
            wp_order_id: data.id
        }
        const result = this.mysql.query("INSERT INTO payments SET ?", sql_data);
        console.log(result[0]);
    }

    async subscription_updated(data) {
        if (!data.customer_id) return;
        const user = await this.get_one("users", "wp_user_id", data.customer_id);
        if (!user) {
            console.warn("Couldn't find user", data.customer_id);
            return;
        }
        const subscription_type = await this.get_one("subscription_types", "name", data.line_items[0].name);
        if (!subscription_type) {
            console.warn("Counldn't find subscription_type", data.line_items[0].name);
            console.log({ data });
            return;
        }
        let sql_data = {
            user_id: user.id,
            subscription_type_id: subscription_type.id,
            is_recurrent: 1,
            start_time: data.start_date,
            end_time: data.end_date,
            type: "regular",
            length: 31,
            created_at: data.date_created,
            modified_at: new Date(),
            internal_status: data.status,
            note: data.customer_note,
            wp_subscription_id: data.id
        }
        const subscription_results = await this.get_one("subscriptions", "wp_subscription_id", data.id);
        let result = null;
        if (subscription_results) {
            result = await this.mysql.query("UPDATE subscriptions SET ? WHERE wp_subscription_id=?", [sql_data, subscription_results.id]).catch(err => {
                console.error("Error updating record");
                console.log(sql_data);
            });
        } else {
            result = await this.mysql.query("INSERT INTO subscriptions SET ?", sql_data).catch(err => {
                console.error("Error updating record");
                console.log(sql_data);
            });
        }
    }
}

module.exports = WooCommerce_Mapper;