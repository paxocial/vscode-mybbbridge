# MyBBBridge

A professional-grade VSCode extension for MyBB theme development with advanced template management, live cache refresh, and CI/CD integration. Built for modern MyBB development workflows.

## Core Features

### Intelligent Template Management
* **Smart Organization**
  - Automatically categorizes templates by their functional groups
  - Maintains MyBB's native group structure (Calendar, Forum Display, etc.)
  - Special handling for global templates (sid = -2)
  - Preserves template versioning

* **Group-Based Template Structure**
  - `/template_sets/<set_name>/<group_name>/`
  - Automatic sorting into proper categories:
    - Forum Display
    - Navigation
    - User Control Panel
    - Global Templates
    - And all standard MyBB template groups
  - "Ungrouped" folder for miscellaneous templates

### Advanced Style Management
* **Theme-Specific Organization**
  - Clean structure: `/styles/<theme_name>/`
  - Automatic cache refresh on save
  - Theme-aware file handling
  - Smart stylesheet detection

* **Cache Management**
  - Real-time cache updates
  - Automatic recovery from cache failures
  - Theme-specific cache handling
  - Support for both local and production environments

### Development Workflow
* **Git Integration**
  - Full CI/CD pipeline support
  - Automated template/style deployment
  - Branch-aware updates
  - Production safeguards
  - Backup system

* **Workspace Features**
  - Live template/style updates
  - Automatic database synchronization
  - Error recovery
  - Detailed logging

## Setup Guide

### 1. Extension Installation
1. Install via VSCode Marketplace
2. Create workspace configuration
3. Configure database connection

### 2. Server Configuration
Required PHP Files:
- `cachecss.php`: Cache management system
- `cacheform.php`: Manual cache control interface
- `update_mybb.php`: CI/CD deployment handler

### 3. Configuration File
Create `.vscode/mbbb.json`:
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

### Cache refresh

To be able to ask MyBB for template cache refresh, MyBBBridge requires you to upload
the tiny `cacheform.php` php file of this repository to your web server, at the root of
your MyBB directory. If you don't plan to use cache refresh, you can skip this step and
set `mybbUrl` to `null` in your `mbbb.json` config file.

### Commands

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