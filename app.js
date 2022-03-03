const express = require("express");
const cors = require("cors");
const app = express();
const multer = require("multer");
const path = require("path");
const Post = require("./models/post");
const fileHelper = require("./file");
const mongoose = require("mongoose");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/images", express.static(path.join(__dirname, "images")));

var url = process.env.DATABASEURL || "mongodb://localhost/nyx_wolves";

mongoose
  .connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Database Connected!");
  })
  .catch((err) => {
    console.log(err)
  });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "__" + file.originalname);
  },
});

const upload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.send("The Nyx_Wolves Assignment");
});

app.get("/posts", (req, res) => {
  Post.find({}, (err, posts) => {
    if (err) {
      // console.log(err);
      res.status(500).json({ error: err });
    } else {
      // console.log(posts)
      res.status(200).json({ posts: posts });
    }
  });
});

app.post("/newpost", upload.array("images", 10), (req, res) => {
  // console.log(req.body);
  const title = req.body.title;
  const description = req.body.description;
  const images = req.files.map((file) => {
    return file.path;
  });

  const newPost = {
    title: title,
    description: description,
    images: images,
  };

  Post.create(newPost)
  .then((post)=>{
    io.emit("post", { action: "post", post: post });
    res.status(200).json({ post: post });
  })
  .catch((err)=>{
    res.status(500).json({ error: err});
  })
});

app.put("/post/:id", upload.array("images", 10), (req, res) => {
  const id=req.params.id;
  const title = req.body.title;
  const description = req.body.description;
  let images=req.files.map(file=>{
    return file.path
  })
  const imgs = req.body.imgs;

  let updatedImages=images.concat(imgs)
  updatedImages=updatedImages.filter(img=>{
    return img!==undefined
  })
  let updatedPost={
    title: title,
    description: description,
    images: updatedImages
  }
  // console.log(updatedPost)
  Post.findById(id, (err, post)=>{
    if(err){
      res.status(500).json({ error: err });
    }else{
      let images=post.images
      let imgToBeDelete=images.filter(img=>{
        return imgs.indexOf(img)<0;
      })
      for(let i in imgToBeDelete){
        fileHelper.deleteFile(imgToBeDelete[i])
      }
    }
  })

  // console.log(updatedPost)

  Post.findByIdAndUpdate(id,updatedPost)
  .then(()=>{
      io.emit("post", { action: "update", postId:id , updatedPost: {...updatedPost,_id:id} });
      res.status(200).json({ msg: "wow!" });
  })
  .catch((err)=>{
    res.status(500).json({ error: err });
  })
  // console.log(title, description, imgs,images);
});

app.delete('/post/:id',(req, res) => {
  const id=req.params.id;
  Post.findById(id, (err, post)=>{
    if(err){
      res.status(500).json({ error: err });
    }else{
      let images=post.images
      for(let i in images){
          fileHelper.deleteFile(images[i]);
      }

      Post.deleteOne({"_id":id})
      .then(()=>{
          io.emit("post", {action: "delete", postId:id});
          res.status(200).json({msg:"Post Deleted"})
      })
      .catch(err=>{
        res.status(500).json({ error: err });
      })
    }
  })
  
})

const server = app.listen(process.env.PORT,process.env.IP);

const io = require("socket.io")(server);
io.on("connection", () => {
  console.log("client connected!");
});
