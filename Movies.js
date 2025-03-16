const mongoose = require("mongoose");

const MovieSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  releaseDate: {
    type: Number,
    min: [1900, "Must be greater than 1899"], //Ensures release date is greater than 1899
    max: [2100, "Must be less than 2100"], //Ensures release date is less than 2100
  },

  //Movie Genre
  genre: {
    type: String,
    enum: [
      "Action",
      "Adventure",
      "Comedy",
      "Drama",
      "Fantasy",
      "Horror",
      "Mystery",
      "Thriller",
      "Western",
      "Science Fiction",
    ],
  },
  actors: [
    {
      actorName: String, //Name of the actor
      characterName: String, //Name of character that actor plays
    },
  ],
});

// Prevents OverwriteModelError
const Movie = mongoose.models.Movie || mongoose.model("Movie", MovieSchema);

module.exports = Movie;
