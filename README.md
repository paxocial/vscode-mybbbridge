# MyBBBridge

A powerful VSCode extension for MyBB theme and template development with Git integration support.

## Features

### Template Management
* Download template sets with their full hierarchy:
  - Organizes templates by prefix under `template_sets/<set_name>/<prefix>/`
  - Supports global templates (sid = -2)
  - Maintains template versioning
  - Handles spaces in template set names

### Style Management
* Manage theme stylesheets:
  - Organized under `styles/<theme_name>/`
  - Automatic cache refresh on save
  - Creates new stylesheets if they don't exist
  - Handles spaces in theme names

### Git Integration
* Full CI/CD workflow support:
  - Automated template and style updates via GitHub Actions
  - Preserves folder structure for deployment
  - Handles both development and production branches
  - Maintains cache consistency across deployments

### Cache Management
* Intelligent cache handling:
  - Automatic stylesheet cache refresh
  - Theme-specific cache updates
  - Manual cache management via cacheform.php
  - Error logging and recovery

## Setup

### 1. Configuration
Create a `.vscode/mbbb.json` file in your workspace root using the command `MyBBBridge: Create config file`.

The default config file looks like this:

```json
{
    "database": {
        "host": "localhost",
        "port": 3306,
        "database": "mybb",
        "prefix": "mybb_",
        "user": "root",
        "password": ""
    },
    "mybbVersion": 1860,
    "mybbUrl": "http://localhost",
    "autoUpload": true
}
```

* `database`: This one should be quite self explanatory!

* `mybbVersion`: MyBB version to be used in newly created theme files. Existing files
  will keep their version metadata.

* `mybbUrl`: URL of your MyBB board. Set to `null` or `''` to disable cache refresh
  requests.

* `autoUpload`: If true, MyBBBridge will try to save theme and stylesheets to database
  each time a corresponding file is saved in VSCode.
  *Overrides existing database entries without confirmation!*

### 2. Cache refresh

To be able to ask MyBB for template cache refresh, MyBBBridge requires you to upload
the tiny `cacheform.php` php file of this repository to your web server, at the root of
your MyBB directory. If you don't plan to use cache refresh, you can skip this step and
set `mybbUrl` to `null` in your `mbbb.json` config file.

### 3. Commands

* `MyBBBridge: Create config file`: Create a new config file, allowing you to start
  using MyBBBridge.

* `MyBBBridge: Load MyBB template set from database`: Download and save all templates
  files of a given template set to the `./template_sets/<template_set_name>/` folder.
  *Overrides existing files without confirmation!*

* `MyBBBridge: Load MyBB style from database`: Download and save all stylesheet files
  of a given style to the `./styles/<style_name>/` folder.
  *Overrides existing files without confirmation!*

## Release Notes

### 0.0.1-alpha

Alpha release providing basic download features.

### 0.0.2-alpha

Alpha release with save features.

### 0.0.3-alpha

Alpha release allowing to refresh MyBB stylesheet cache files.

### 0.0.4-alpha

Alpha release improving existing cache functionalities, and allowing a a CI/CD workflow with one additional script - not included in repo.

### 1.0 - Pre-Release

Sorted all templates into folders by prefix name, we adjusted the saving functionality so it will be able to read the new folder structure.  Added global templates.