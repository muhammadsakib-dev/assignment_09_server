import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";

// Load environment variables
dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.DB_NAME || "WedPlan";

interface SeedService {
  serviceName: string;
  category: string;
  description: string;
  price: number;
  location: string;
  images: string[];
  highlights: string[];
  status: "approved";
  isActive: boolean;
}

const SEED_SERVICES: SeedService[] = [
  {
    serviceName: "Elysian Moments Cinematic Wedding Photography & Film",
    category: "Photography & Videography",
    description:
      "Award-winning fine-art photography and 4K drone cinematography capturing raw emotion, candid laughs, and timeless elegance for luxury weddings worldwide.",
    price: 3200,
    location: "New York, NY",
    images: [
      "https://ik.imagekit.io/muhammadsakib/Assignment_09/wedding_01.jpg",
      "https://ik.imagekit.io/muhammadsakib/Assignment_09/wedding_02.png",
      "https://ik.imagekit.io/muhammadsakib/Assignment_09/wedding%20vendor.jpg",
    ],
    highlights: [
      "Full Day 10-Hour Coverage",
      "Two Principal Photographers",
      "4K Drone Aerial Footage",
      "Online Password-Protected Gallery",
      "Handcrafted Heirloom Album",
    ],
    status: "approved",
    isActive: true,
  },
  {
    serviceName: "The Glasshouse Conservatory & Botanical Gardens",
    category: "Wedding Venues",
    description:
      "A sun-drenched architectural glass sanctuary nestled within 40 acres of private botanical gardens. Perfect for ethereal indoor ceremonies and grand starlit receptions.",
    price: 8500,
    location: "San Francisco, CA",
    images: [
      "https://ik.imagekit.io/muhammadsakib/Assignment_09/wedding_02.png",
      "https://ik.imagekit.io/muhammadsakib/Assignment_09/wedding_01.jpg",
    ],
    highlights: [
      "Capacity up to 350 Guests",
      "Bridal Suite & Groom Lounge",
      "Full Commercial Kitchen",
      "Curfew until 1:00 AM",
      "Private On-site Valet Parking",
    ],
    status: "approved",
    isActive: true,
  },
  {
    serviceName: "Blush & Botanical Luxury Floral & Theme Installations",
    category: "Decoration & Florist",
    description:
      "Bespoke floral architecture, cascading hanging ceiling blooms, sculptural floral arches, and candlelit tablescapes tailored exclusively to your wedding aesthetic.",
    price: 2800,
    location: "Chicago, IL",
    images: [
      "https://ik.imagekit.io/muhammadsakib/Assignment_09/wedding%20vendor.jpg",
      "https://ik.imagekit.io/muhammadsakib/Assignment_09/wedding_01.jpg",
    ],
    highlights: [
      "Grand Ceremony Floral Arch",
      "Bridal Bouquet & 6 Boutonnieres",
      "12 Luxury Reception Tablescapes",
      "Full Installation & Strike Included",
      "Eco-friendly Floral Foam-Free Design",
    ],
    status: "approved",
    isActive: true,
  },
  {
    serviceName: "Artisan Banquet Grand Gourmet Wedding Feast",
    category: "Catering Services",
    description:
      "Farm-to-table culinary brilliance featuring customized multi-course plated dinners, theatrical live oyster bars, artisan dessert grazing tables, and sommelier-curated wine pairings.",
    price: 5400,
    location: "Austin, TX",
    images: [
      "https://ik.imagekit.io/muhammadsakib/Assignment_09/wedding_01.jpg",
      "https://ik.imagekit.io/muhammadsakib/Assignment_09/wedding_02.png",
    ],
    highlights: [
      "4-Course Plated Luxury Dinner",
      "Passed Hors d'oeuvres Cocktail Hour",
      "Dietary Accommodations (Vegan, GF, Halal)",
      "Late-Night Gourmet Snack Bar",
      "Professional White-Glove Service Staff",
    ],
    status: "approved",
    isActive: true,
  },
  {
    serviceName: "Aura Bridal Haute Couture Glamour & Luxury Hair Styling",
    category: "Makeup & Styling",
    description:
      "Red-carpet bridal artistry specializing in luminous glass-skin glow, bespoke airbrush makeup, and timeless modern chignons designed to last all day and night.",
    price: 1600,
    location: "Miami, FL",
    images: [
      "https://ik.imagekit.io/muhammadsakib/Assignment_09/wedding_02.png",
      "https://ik.imagekit.io/muhammadsakib/Assignment_09/wedding%20vendor.jpg",
    ],
    highlights: [
      "Pre-Wedding In-Studio Trial",
      "Luxury Airbrush Makeup & Lashes",
      "Touch-up Kit for the Wedding Day",
      "Styling for Bride + 4 Bridesmaids",
      "On-site Touch-ups until Reception",
    ],
    status: "approved",
    isActive: true,
  },
  {
    serviceName: "Maison Blanche Haute Bridal Couture Atelier",
    category: "Wedding Fashion",
    description:
      "Handmade bespoke wedding gowns, Parisian silk veils, and tailored tuxedo bespoke ensembles crafted with French chantilly lace, hand-beaded pearls, and master corsetry.",
    price: 4200,
    location: "New York, NY",
    images: [
      "https://ik.imagekit.io/muhammadsakib/Assignment_09/wedding_01.jpg",
      "https://ik.imagekit.io/muhammadsakib/Assignment_09/wedding_02.png",
    ],
    highlights: [
      "Personal Designer Consultation",
      "3 Private Fitting Sessions",
      "Custom Silk Cathedral Veil Included",
      "Complimentary Gown Preservation",
      "Matching Pocket Square & Accessories",
    ],
    status: "approved",
    isActive: true,
  },
];

async function seed() {
  console.log(`Connecting to MongoDB: ${uri} (db: ${dbName})...`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    console.log("MongoDB connection established.");

    const usersCol = db.collection("user");
    const servicesCol = db.collection("services");

    // 1. Ensure Admin User
    const existingAdmin = await usersCol.findOne({
      $or: [{ email: "admin@wedplan.com" }, { role: "admin" }],
    });

    let adminId: string;
    if (existingAdmin) {
      console.log(`Admin account already exists: ${existingAdmin.email} (Role: ${existingAdmin.role})`);
      adminId = existingAdmin._id ? existingAdmin._id.toString() : String(existingAdmin.id);
      // Ensure role is admin and isBlocked is false
      await usersCol.updateOne(
        { _id: existingAdmin._id },
        { $set: { role: "admin", isBlocked: false } },
      );
    } else {
      const newAdminId = new ObjectId();
      const adminDoc = {
        _id: newAdminId,
        id: newAdminId.toHexString(),
        name: "WedPlan Administrator",
        email: "admin@wedplan.com",
        role: "admin",
        isBlocked: false,
        image: "https://ik.imagekit.io/muhammadsakib/Assignment_09/wedding_01.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await usersCol.insertOne(adminDoc);
      adminId = newAdminId.toHexString();
      console.log("Created default Admin account: admin@wedplan.com (Role: admin)");
    }

    // 2. Ensure Vendor User
    const existingVendor = await usersCol.findOne({
      email: "vendor@wedplan.com",
    });

    let vendorId: string;
    let vendorName = "Lumière Weddings & Events";
    let vendorEmail = "vendor@wedplan.com";
    let vendorPhone = "+1 (555) 234-5678";

    if (existingVendor) {
      console.log(`Vendor account already exists: ${existingVendor.email}`);
      vendorId = existingVendor._id ? existingVendor._id.toString() : String(existingVendor.id);
      vendorName = String(existingVendor.name || vendorName);
      vendorEmail = String(existingVendor.email || vendorEmail);
      await usersCol.updateOne(
        { _id: existingVendor._id },
        {
          $set: {
            role: "vendor",
            isBlocked: false,
            subscriptionPlan: "premium",
            businessName: vendorName,
          },
        },
      );
    } else {
      const newVendorId = new ObjectId();
      const vendorDoc = {
        _id: newVendorId,
        id: newVendorId.toHexString(),
        name: "Lumière Weddings & Events",
        email: "vendor@wedplan.com",
        role: "vendor",
        isBlocked: false,
        businessName: "Lumière Weddings & Events",
        phone: "+1 (555) 234-5678",
        location: "New York, NY",
        subscriptionPlan: "premium",
        image: "https://ik.imagekit.io/muhammadsakib/Assignment_09/wedding%20vendor.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await usersCol.insertOne(vendorDoc);
      vendorId = newVendorId.toHexString();
      console.log("Created default Vendor account: vendor@wedplan.com (Role: vendor, Premium)");
    }

    // 3. Ensure Customer User
    const existingCustomer = await usersCol.findOne({
      email: "customer@wedplan.com",
    });

    if (existingCustomer) {
      console.log(`Customer account already exists: ${existingCustomer.email}`);
    } else {
      const newCustomerId = new ObjectId();
      const customerDoc = {
        _id: newCustomerId,
        id: newCustomerId.toHexString(),
        name: "Sarah & David Jenkins",
        email: "customer@wedplan.com",
        role: "customer",
        isBlocked: false,
        image: "https://ik.imagekit.io/muhammadsakib/Assignment_09/wedding_02.png",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await usersCol.insertOne(customerDoc);
      console.log("Created default Customer account: customer@wedplan.com (Role: customer)");
    }

    // 4. Seed Services if empty or fewer than 6
    const approvedServicesCount = await servicesCol.countDocuments({
      status: "approved",
      isActive: true,
    });

    console.log(`Currently found ${approvedServicesCount} approved active services in database.`);

    if (approvedServicesCount < 6) {
      console.log("Seeding verified wedding services...");
      const now = new Date();

      for (const item of SEED_SERVICES) {
        const existing = await servicesCol.findOne({
          serviceName: item.serviceName,
        });

        if (!existing) {
          await servicesCol.insertOne({
            ...item,
            vendorId,
            vendorName,
            vendorEmail,
            vendorPhone,
            vendorIsPremium: true,
            createdAt: now,
            updatedAt: now,
          });
          console.log(`  + Seeded: "${item.serviceName}" [${item.category}]`);
        }
      }
      console.log("Wedding services seeded successfully.");
    } else {
      console.log("Database already has 6+ approved services. Skipping service seeding.");
    }

    console.log("\n==========================================");
    console.log("WedPlan Database Seeding Completed!");
    console.log("Admin:    admin@wedplan.com");
    console.log("Vendor:   vendor@wedplan.com");
    console.log("Customer: customer@wedplan.com");
    console.log("==========================================\n");
  } catch (error) {
    console.error("Seeding failed with error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
