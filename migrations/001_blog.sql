CREATE TABLE IF NOT EXISTS blog_posts (
  slug text PRIMARY KEY,
  title varchar(160) NOT NULL,
  category varchar(60) NOT NULL,
  excerpt varchar(400) NOT NULL,
  body text NOT NULL,
  image_url text,
  read_minutes integer NOT NULL CHECK (read_minutes > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip_hash char(64) PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
  id smallint PRIMARY KEY CHECK (id = 1),
  email text NOT NULL UNIQUE,
  password_salt text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO blog_posts (slug, title, category, excerpt, body, image_url, read_minutes)
VALUES
(
  'blog-plot-buying-checklist',
  'A simple checklist before you buy a residential plot',
  'Buying guide',
  'The questions to ask, the places to visit and the paperwork to see before you pay any amount.',
  'Buying a plot is one of the biggest decisions a family makes. A calm, step-by-step approach makes it far easier.

1. Visit the site in person
Photos help, but a visit tells you more. Check how you reach the layout, the width and condition of internal roads, the surroundings, and whether the plot boundaries are clearly marked.

2. Ask about approvals
Ask whether the land has been converted for residential use and whether the layout has been approved by the competent authority. Request copies rather than relying on verbal assurance.

3. Check the basics of the layout
Roads, street lighting, drainage and sewage arrangements. Water and power connections, or the plan to provide them. Plot size, shape and the direction it faces.

4. Review the paperwork with a legal adviser
Share the documents with an independent lawyer of your choice and ask for their opinion before you commit.

5. Understand the full cost
Along with the plot price, plan for stamp duty, registration charges and any other costs mentioned in the agreement. Ask for everything in writing.

6. Pay safely and keep records
Make payments through traceable banking channels, collect a receipt for every payment and read the agreement fully before you sign.

This article is general information and not legal advice.',
  '/map.jpg', 5
),
(
  'blog-dc-conversion-explained',
  'DC conversion and layout approval, explained simply',
  'Approvals',
  'What these terms mean, why they matter and which copies you should ask for.',
  'You will often hear that a plot is “DC converted” or “approved”. Here is what these phrases generally mean in Karnataka.

What is DC conversion?
Land that is recorded for agricultural use has to be converted to non-agricultural use before it can be used for a residential layout. In Karnataka this conversion is granted through an order from the Deputy Commissioner (DC) of the district.

What is layout approval?
Separate from conversion, a residential layout generally needs approval of its plan from the competent planning authority. The approved plan shows the plots, roads and common areas.

Why both matter
Conversion shows the land can be used for housing, and an approved layout plan shows how the land is divided. Together they help you confirm that the plot you are buying is part of a properly planned layout.

What you can ask for
A copy of the conversion order and the survey number it refers to. A copy of the approved layout plan. The plot number and dimensions as shown on that plan.

Match the documents to the plot
Check that the survey number, plot number and measurements in the documents match the plot you were shown on site. Your legal adviser can help you confirm this.

This article is general information and not legal advice. Rules and procedures can change, so please verify the latest requirements.',
  '/banner.jpg', 4
),
(
  'blog-documents-to-verify',
  'Documents to verify before registering a plot',
  'Documents',
  'A clear list of the records worth checking with your own legal adviser.',
  'Clear paperwork is the foundation of a worry-free purchase. These are the records most buyers ask to see.

Ownership records
The previous sale deeds that show how the seller came to own the land. The RTC (Record of Rights, Tenancy and Crops) extract for the land.

Encumbrance certificate
An encumbrance certificate shows whether the property has registered loans or other claims against it. Ask your lawyer for how many years it should cover.

Conversion and layout approvals
The conversion order and the approved layout plan show that the land can be used for housing and how the plots are laid out.

Khata and tax records
Check the khata certificate and extract, and the receipts for property or land tax paid up to date.

Agreement and registration
Read the agreement for sale carefully, including payment schedule and timelines. Confirm that the sale deed is registered at the sub-registrar’s office in your name.

This article is general information and not legal advice. Please consult a qualified lawyer for your specific purchase.',
  '/team.jpg', 5
),
(
  'blog-plot-or-apartment',
  'Plot or apartment: which suits your plans?',
  'Planning',
  'A balanced look at freedom, cost, time and upkeep to help you decide.',
  'Both choices can be right. The better one is the one that fits your family, budget and timeline.

Freedom to design
With a plot you decide the design, the number of floors, the layout of rooms and the garden. With an apartment, the design is fixed by the builder.

Time and effort
Building a home on a plot takes planning, approvals for construction and time to manage the work. An apartment can be simpler if you want to move in sooner.

Cost and budget
A plot lets you spread spending across two stages, buying the land first and building later when you are ready. Ask lenders about options for both the plot and the construction.

Upkeep and community
Apartments usually come with shared amenities and maintenance charges. Plotted communities offer more space and privacy, and you take care of your own home.

A long-term view
Land is a long-term asset, but no property gives guaranteed returns. Choose a location you are comfortable with and verify every document before you decide.',
  '/achievement-01.jpg', 4
)
ON CONFLICT (slug) DO NOTHING;
