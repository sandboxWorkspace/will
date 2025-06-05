# [SEOP Digital Hub](https://sandboxworkspace.github.io/will/)
### Developer: Wilbert Liu *[(Personal Site tbd)](https://example.com/)*

A mobile-first web app aiming to streamline operations and digitize workflows by serving as a centralized platform for inventory management, maintenance requests, and resource reservations. The primary goal is to enhance efficiency, reduce redundancy, and improve communication via increased accessibility and visibility.

Keeping scalability in mind, this should allow for future expansion and ideas/suggestions are welcome!

Live Feature List:
- Inventory Requests and Tracking
- Maintenance Requests and Tracking

Currently working on:
``
Migrating away from google forms/sheets
Adding admin console/view and status permissions (pending to complete)
Adding user roles and authentification via anonymous auth
``

## Pending Ideas and ToDo List

Future Ideas:
- Sync database with more user friendly interface
- Pitchdeck & PPTX
- User Guide with visuals
- Styling Guide for elements (buttons forms etc)
- Add transportation kiosk QR validation and agreement
- Add QR Code generator function (Dark Mode as well) - email to print
- FAQ and suggestion(s) form

Quick List:
- Add feature wishlist
- Add handoff vitals (pt. transfer method)
- Add Quick Access Tab ()
- Add OCR grader
- Add *optional* urgency option (e.g. concern, can wait, immediate, etc...)
- Rewrite package.json

Inventory:
- Database tag items and sort (PerformanceHealth minimum order quantity)
- Complete form logic overhaul for dynamic table:
    - Add thresholds for minimum quantity
    - Option for new supply request to supplyItems.json
    - 
- Submissions: data collection, analysis, and prediction
- Migrate from google apps script email function

Reservation System:
- Equipment reservation table (FES Bike & Xcite)


How complex would it be to consolidate the code and logic for requestMaintenance.js requestWishlist.js and requestSupply.js into a single 'requestForm.js' file?

Maybe I can create a BaseRequestHandler class that contains the truly common methods (like showStatus, clearStatus, basic constructor setup), and then have MaintenanceRequestHandler, SupplyRequestHandler, and WishlistRequestHandler inherit from this base class, overriding or extending methods as needed. This would achieve some code reuse without the full complexity of a single, monolithic handler.

I should really take the time to refactor the code so it's simplier
I should also document edge cases for submissions
Then I should work on making a scribe/follow along guide with screenshots or gifs for how to use
## Setup instructions

Note to self: refer to ``code ~/.bash_history ``

```
git clone https://github.com/sandboxWorkspace/will
npm --version
    11.2.0
node --version
    v22.14.0
npm install
npx vite
npm run dev
npm run build
npm run serve
```


Publish instructions
MAKE SURE TO PUSH CHANGES TO MAIN FIRST
Also add new pages and import js modules if needed to vite.config file


```
chmod +x deploy.sh
./deploy.sh


git checkout main
npm run build
npm run serve
git add .
git commit -m ""
git push origin main
mkdir ../temp_gh_pages
cp -r dist/* ../temp_gh_pages/
git checkout gh-pages
rm -rf *
cp -r ../temp_gh_pages/* .
git add .
git commit -m "Deploy to gh-pages"
git push origin gh-pages
rm -rf ../temp_gh_pages
git checkout main
```