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
``

## Pending Ideas and ToDo List

Future Ideas:
- Pitchdeck & PPTX
- Visual User Guide
- FAQ and suggestion(s) form

Quick List:
- Add QR Code generator function
- Add Quick Access Tab ()
- Add OCR grader
- Add *optional* urgency option (e.g. concern, can wait, immediate, etc...)
- Reconvert logo.svg to ico and resize png sizes properly
- Rewrite package.json

Migrate to firebase (refactor for any database):
- Inventory, Maintenance, both Trackers 

Inventory:
- Autocomplete livesearch typeahead with default add ins (requester name, item name, location, etc...)
- Database tag items and sort (PerformanceHealth minimum order quantity)
- Complete form logic overhaul for dynamic table:
    - Allow multiple items to be requested async
    - Request location (e.g. gym, eval room, backstock, etc...)
    - Add thresholds for minimum quantity
    - Differentiate room restock vs reorder options
    - Option for new item requests
    - 
- Submissions: data collection, analysis, and prediction
- Migrate from google apps script email function

Reservation System:
- Equipment reservation table (FES Bike & Xcite)
- Tech reservation

Submission Trackers:
- Increase visibility
- Add logic to prevent repeated requests

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