const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 3000;
const app = express();
const uri = process.env.MONGODB_URI;

app.use(express.json());
app.use(cors())

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const database = client.db('coffee-store');
    const coffeeStoreCollection = database.collection('coffees');
    const orderCollection = database.collection('orders')


    // Coffees API
    app.get('/coffees', async (req, res) => {
      const result = await coffeeStoreCollection.find().toArray();
      res.send(result)
    })

    // save the coffee into data base
    app.post('/add-coffees', async (req, res) => {
      const coffeeData = req.body;
      const quantity = coffeeData.quantity;
      coffeeData.quantity = parseInt(quantity)
      const result = await coffeeStoreCollection.insertOne(coffeeData)
      // console.log(result);
      res.status(201).send({ ...result, message: "data is coming" })
    })

    // single coffees
    app.get('/coffee/:id', async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) }
      const result = await coffeeStoreCollection.findOne(query);
      res.send(result)
    })

    // 
    app.get('/my-coffees/:email', async (req, res) => {
      const { email } = req.params;
      const filter = { email };
      const result = await coffeeStoreCollection.find(filter).toArray()
      res.status(200).send(result, { message: "send the email coming" })
      console.log(result);
    })

    // patch method for liked
    app.patch('/like/:coffeeId', async (req, res) => {
      const id = req.params.coffeeId;
      const { email } = req.body;
      const filter = { _id: new ObjectId(id) };
      const coffee = await coffeeStoreCollection.findOne(filter);

      // checked if the user has already liked
      const alreadyLiked = coffee?.likedBy.includes(email)

      const updateDoc = alreadyLiked ? {
        $pull: {     // its like pop
          likedBy: email
        }
      } : {
        $addToSet: {      //its like push
          likedBy: email
        }
      }

      await coffeeStoreCollection.updateOne(filter, updateDoc);
      res.send({ message: alreadyLiked ? "dislike successful" : "Like successful", liked: !alreadyLiked })
    })


    // post method for ordered
    app.post('/place-order/:id', async (req, res) => {
      const { id } = req.params;
      const orderData = req.body;
      const coffeeItem = await coffeeStoreCollection.findOne({ _id: new ObjectId(id) })
      if (!coffeeItem || coffeeItem.quantity <= 0) {
        return res.status(400).send({ message: "Out of stock or item not found." })
      }
      const result = await orderCollection.insertOne(orderData);
      if (result.acknowledged) {
        // update quantity from coffee collection
        await coffeeStoreCollection.updateOne({ _id: new ObjectId(id) }, {
          $inc: {
            quantity: -1,
          }
        })
      }
      // console.log(result);
      res.status(201).send(result)
    })

    // get all order by customer email
    app.get('/my-orders/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { customerEmail: email };
      const allOrders = await orderCollection.find(filter).toArray();
      for (const order of allOrders) {
        const orderId = order.coffeeId;
        const fullCoffeeData = await coffeeStoreCollection.findOne({ _id: new ObjectId(orderId) });
        order.name = fullCoffeeData.name
        order.photo = fullCoffeeData.photo
        order.price = fullCoffeeData.price
        order.quantity = fullCoffeeData.quantity
      }
      res.send(allOrders)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send("Welcome to coffee store server..! Server is cooking now!")
})

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
})