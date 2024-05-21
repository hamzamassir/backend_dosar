const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const axios = require('axios'); // Import axios for making HTTP requests

const app = express();
const port = 3001;

// Use the cors middleware to enable CORS
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'uploads/');
	},
	filename: (req, file, cb) => {
		const marathonName = req.body.Name.replace(/\s+/g, '_');
		const uniqueSuffix = `${marathonName}_${Date.now()}`;
		const ext = path.extname(file.originalname);
		cb(null, `${uniqueSuffix}${ext}`);
	}
});

const upload = multer({ storage });

// Ensure the uploads directory exists
if (!fs.existsSync('uploads')) {
	fs.mkdirSync('uploads');
}

// POST endpoint to handle form submissions
app.post('/api/marathons', upload.array('image'), async (req, res) => {
	const marathon = {
		ID: req.body.ID,
		Name: req.body.Name,
		Description: req.body.Description,
		Distance: req.body.Distance,
		Country: req.body.Country,
		Gender: req.body.Gender,
		images: req.files.map((file) => file.filename)
	};

	// Load existing marathons from file
	let marathons = [];
	if (fs.existsSync('marathons.json')) {
		const data = fs.readFileSync('marathons.json');
		marathons = JSON.parse(data);
	}

	// Add new marathon to the list
	marathons.push(marathon);

	// Save the updated list back to the file
	fs.writeFileSync('marathons.json', JSON.stringify(marathons, null, 2));

	try {
		// Send data to the external API
		const response = await axios.post('http://127.0.0.1:5000/upload', {
			images: marathon.images.map((img) => path.resolve('uploads', img)),
			'marathon name': marathon.Name
		});
		console.log('External API response:', response.data);

		res.status(201).json({
			message: 'Marathon created successfully',
			marathon,
			externalApiResponse: response.data
		});
	} catch (error) {
		console.error('Error sending data to external API:', error);
		res.status(500).json({
			message: 'Error creating marathon',
			error: error.message
		});
	}
});

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});

app.get('/api/marathons', (req, res) => {
	if (fs.existsSync('marathons.json')) {
		const data = fs.readFileSync('marathons.json');
		const marathons = JSON.parse(data);
		res.json(marathons);
	} else {
		res.json([]);
	}
});
