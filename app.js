const express = require("express");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const morgan = require("morgan");
const sanitize = require("sanitize-filename");

const app = express();
app.enable("trust proxy");

app.use(
    morgan("[:date[web]][:remote-addr][:method :url :status :response-time ms][:user-agent]", {
        stream: fs.createWriteStream("./requests.log", { flags: "a" }),
    })
);
app.use(morgan("dev"));
app.use(express.static("uploads", { extensions: ["png", "jpg", "jpeg", "mp4", "gif"] }));
app.use(express.static("public", { extensions: ["html", "png"] }));
app.use(
    fileUpload({
        limits: { fileSize: 16 * 1024 * 1024 },
    })
);
morgan.token("remote-addr", (req, res) => {
    return (
        req.headers["cf-connecting-ip"] ||
        req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress
    );
});

const accessLog = fs.createWriteStream("./access.log", { flags: "a" });
app.post("/upload", (req, res) => {
    const users = JSON.parse(fs.readFileSync("accounts.json", "utf-8")).users;
    if (users[req.body.username] !== req.body.password) return res.send("saale");

    accessLog.write(`${req.body.username} uploaded ${req.body.filename}\n`);
    req.body.filename = sanitize(req.body.filename);

    if (fs.existsSync(`uploads/${req.body.filename}`)) return res.send("file exists");

    fs.writeFileSync(`uploads/${req.body.filename}`, req.files.file.data, (err) => {
        if (err) {
            console.log(err);
            return res.send("err");
        }
    });
    return res.redirect(`/${req.body.filename}`);
});

app.get("*", (req, res) => {
    return res.redirect("/404");
});

app.listen(process.env.PORT || 5000, () => {
    console.log(`Listening on port http://localhost:${process.env.PORT || 5000}`);
});
