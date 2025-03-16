require("dotenv").config(); // Load environment variables

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const passport = require("passport");
const cors = require("cors");
const jwt = require("jsonwebtoken");

require("./auth_jwt"); // Imports JWT token

const authJwtController = require("./auth_jwt");
const User = require("./Users");
const Movie = require("./Movies");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize()); // Initialization

//Checks environment variables
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing!");
  process.exit(1);
}

//Checks if SECRET KEY is present
if (!process.env.SECRET_KEY) {
  console.error("SECRET_KEY is missing!");
  process.exit(1);
}

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB 🎉"); //Prints this successfully (with the awesome emoji of course :-))
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

const router = express.Router();

// Signup Route
router.post("/signup", async (req, res) => {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ success: false, msg: "Please include both username and password." });
  }

  try {
    const user = new User({
      name: req.body.name,
      username: req.body.username,
      password: req.body.password,
    });

    await user.save();
    return res.status(201).json({ success: true, msg: "User created successfully." }); //Prints if user created successfully
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "User already exists." }); //Prints if user already exists
    } else {
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error." }); //Prints if there is a server error
    }
  }
});

// Signin Route
router.post("/signin", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username }).select("+password"); // Ensure password field is included

    if (!user) {
      return res.status(401).json({ success: false, msg: "User not found." }); //Prints if user is not found or nonexistent
    }

    const isMatch = await user.comparePassword(req.body.password); // Ensure comparePassword method exists

    if (isMatch) {
      const userToken = { id: user._id, username: user.username };
      const token = jwt.sign(userToken, process.env.SECRET_KEY, { expiresIn: "1h" });
      return res.json({ success: true, token: "JWT " + token });
    } else {
      return res.status(401).json({ success: false, msg: "Incorrect password." }); //If password is incorrect prints
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Movie Routes
router.route("/movies")
  .get(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const movies = await Movie.find();
      return res.json({ success: true, movies });
    } catch (err) {
      return res.status(500).json({ success: false, message: "GET request failed", error: err.message }); //Prints if get fails
    }
  })
  .post(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const movie = new Movie(req.body);
      await movie.save();
      return res.status(201).json({ success: true, message: "Movie added successfully", movie }); //Adds movie
    } catch (err) {
      return res.status(500).json({ success: false, message: "POST request failed", error: err.message }); //Prints if post request fails
    }
  });

router.route("/movies/:title")
  .put(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const { title } = req.params;
      const updateData = req.body;

      // Ensure the update includes at least one valid field
      if (!updateData.releaseDate && !updateData.genre && !updateData.actors) {
        return res.status(400).json({ success: false, message: "Provide at least one field to update." }); //Prints if there is no update to be made
      }

      // Validate releaseDate range
      if (updateData.releaseDate && (updateData.releaseDate < 1900 || updateData.releaseDate > 2100)) {
        return res.status(400).json({ success: false, message: "Release year must be between 1900 and 2100." }); //Ensures release date is between 1900 and 2100
      }

      // Validate genre
      const validGenres = [
        "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", //Defines genres
        "Mystery", "Thriller", "Western", "Science Fiction"
      ];
      if (updateData.genre && !validGenres.includes(updateData.genre)) {
        return res.status(400).json({ success: false, message: "Invalid genre, please try again." }); //Prints if genre is invalid 
      }

      // Validate actors array
      if (updateData.actors && updateData.actors.length < 3) {
        return res.status(400).json({ success: false, message: "A movie must have at least 3 actors." }); //Makes sure there is at least 3 actors
      }

      // Find and update the movie
      const updatedMovie = await Movie.findOneAndUpdate({ title }, updateData, { new: true });

      if (!updatedMovie) {
        return res.status(404).json({ success: false, message: "Movie not found." }); //Prints if movie is not found
      }

      res.json({ success: true, message: "Movie updated successfully.", movie: updatedMovie }); //Prints if movie correctly updates

    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
  })
  .get(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const movie = await Movie.findOne({ title: req.params.title });
      if (!movie) return res.status(404).json({ success: false, message: "Movie not found" }); //Prints if movie is not found
      return res.json({ success: true, movie });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
  })
  .delete(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const result = await Movie.deleteOne({ title: req.params.title });
      return res.json({ success: true, message: "Movie deleted", result });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
  });

// Serve React frontend 
app.use(express.static(path.join(__dirname, "build")));

app.get("/", (req, res) => {
  return res.send("Welcome to the Movie API");
});

app.use("/", router);

// Start Server
const PORT = process.env.PORT || 8080;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
});
