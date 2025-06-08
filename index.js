import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import fs from "fs";
import pg from "pg";
import env from "dotenv";

env.config();

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect();

const app = express();
const port = 3000;

const yourKey = process.env.PG_API_KEY;

var countWatched = 0;
var countLater = 0;
var watchedShows = [];
var laterShows = [];
let show;
let watched = [];
let later = [];

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

async function checkWatched()
{  
    const result = await db.query("SELECT * FROM watchedlist ORDER BY movie ASC");
    watchedShows = [];
    result.rows.forEach((show) => {
        watchedShows.push({id: show.id, name: show.movie});
    });
    watched = [];
    for (var i = 0; i < watchedShows.length; i++)
    {
    const response = await axios(`http://www.omdbapi.com/?apikey=${yourKey}&t=${watchedShows[i].name}`);
    const results = response.data;
    watched.push(results);
    }
}

async function checkWatchLater()
{
    const result = await db.query("SELECT * FROM watchlater ORDER BY movie ASC");
    laterShows = [];
    result.rows.forEach((shows) => {
        laterShows.push({id: shows.id, name: shows.movie});
    });
    later = [];
    for (var i = 0; i < laterShows.length; i++)
    {
    const response = await axios(`http://www.omdbapi.com/?apikey=${yourKey}&t=${laterShows[i].name}`);
    const results = response.data;
    later.push(results);
    }
}


app.get("/", async (req,res) => {
try {
    const response = await axios(`http://www.omdbapi.com/?apikey=${yourKey}&t=person+of+interest`);
    const result = response.data;
    res.render("index.ejs", {data: result});
    console.log(countWatched, countLater);
    console.log(show);
} catch(error) {
    console.error("Failed to make request:", error.message);
    res.render("index.ejs", {
    error: "You fucked up",});
}
});

app.get("/watchedalr", async (req, res) => {
    await checkWatched();
    res.render("watched.ejs" , {shows: watched, remove: watchedShows});
});

app.get("/watchlater", async (req, res) => {
    await checkWatchLater();
    res.render("later.ejs" , {shows: later, remove: laterShows});
});


app.post("/post", async (req, res) => {
    show = req.body["PName"];
    var m = show.slice(0,1)
    show = m.toUpperCase() + show.slice(1);
    try {
        const response = await axios(`http://www.omdbapi.com/?apikey=${yourKey}&t=${req.body["PName"]}`);
        const result = response.data;
        res.render("media.ejs", {data: result});
        console.log(show);
    } catch(error) {
        console.error("Failed to make request:", error.message);
        res.render("index.ejs", {
        error: "You fucked up"});
        console.log(error);
    }
});

app.post("/watched", async (req, res) => {
    const add = await db.query("INSERT INTO watchedlist (movie) VALUES ($1)", [show]);
    res.render("index.ejs");
});

app.post("/later", async (req, res) => {
    const add = await db.query("INSERT INTO watchlater (movie) VALUES ($1)", [show]);
    res.render("index.ejs");
});

app.post("/deletewatched", async (req, res) => {
    const id = req.body["DeleteShowName"];
    await db.query("DELETE FROM watchedlist WHERE id = ($1)" , [id]);
    await checkWatched();
    console.log(watchedShows);
    res.redirect("/watchedalr");
});

app.post("/deletelater", async (req, res) => {
    const id = req.body["DeleteShowName"];
    await db.query("DELETE FROM watchlater WHERE id = ($1)" , [id]);
    await checkWatchLater();
    console.log(watchedShows);
    res.redirect("/watchlater");
});

  app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});

