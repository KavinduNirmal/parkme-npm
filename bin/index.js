#!/usr/bin/env node

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import inquirer from "inquirer";
import chalk from "chalk";
import simpleGit from "simple-git";
import ora from "ora";
import { text } from "stream/consumers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function logStep(message) {
  console.log(chalk.cyan.bold("\u203A "), chalk.white(message));
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

// clone the repository
async function cloneRepo(appPath) {
  const git = simpleGit();
  const repo = "https://github.com/IT24102532/parkingManagement.git";
  const branch = "master";

  const spinner = ora({
    text: "Cloning repository...",
    color: "cyan",
  }).start();
  try {
    await fs.ensureDir(appPath);
    await git.clone(repo, appPath, ["-b", branch]);
    spinner.succeed("Cloning completed.");
  } catch (error) {
    spinner.fail("Failed to clone repository.");
    console.error(error);
    process.exit(1);
  }
}

(async () => {
  console.log(chalk.green.bold("\nWelcome to Park.me Project Setup!\n"));

  const { projectName } = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
      message: "Enter your project name:",
      default: "park-me-app",
    },
  ]);

  const targetDir = path.resolve(process.cwd(), projectName);
  console.log("\n");
  // Check if directory exists
  if (fs.existsSync(targetDir)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: `Directory \"${projectName}\" already exists. Overwrite?`,
        default: false,
      },
    ]);
    if (!overwrite) process.exit(0);
    await fs.remove(targetDir);
  }

  const appDir = path.join(targetDir, "app");
  const dataDir = path.join(targetDir, "data");

  // Step 1: Clone the repository
  logStep("Cloning the repository...");
  await cloneRepo(appDir);

  // Step 2: Create data folder and copy files
  console.log("\n");
  logStep("Creating data folder and copying files...");
  const dataSpinner = ora({
    text: "Setting up data directory...\n",
    color: "cyan",
  }).start();
  try {
    await fs.ensureDir(dataDir);
    const dataFiles = [
      "users.json",
      "bookings.json",
      "transactions.json",
      "parkingSlots.json",
    ];
    for (const file of dataFiles) {
      await fs.copyFile(
        path.join(__dirname, "../templates", file),
        path.join(dataDir, file)
      );
    }
    dataSpinner.succeed("Data folder and files set up successfully.");
  } catch (error) {
    dataSpinner.fail("Failed to set up data folder or copy files.");
    console.error(error);
    process.exit(1);
  }

  // Step 3: Generate config.properties
  console.log("\n");
  logStep("Generating config.properties...");
  const configSpinner = ora({
    text: "Generating config.properties...",
    color: "cyan",
  }).start();
  try {
    const template = await fs.readFile(
      path.join(__dirname, "../assets/config.properties.template"),
      "utf-8"
    );
    const result = template
      .replace(
        "%%user.file.path%%",
        normalizePath(path.join(dataDir, "users.json"))
      )
      .replace(
        "%%booking.file.path%%",
        normalizePath(path.join(dataDir, "bookings.json"))
      )
      .replace(
        "%%transaction.file.path%%",
        normalizePath(path.join(dataDir, "transactions.json"))
      )
      .replace(
        "%%slots.file.path%%",
        normalizePath(path.join(dataDir, "parkingSlots.json"))
      );

    await fs.outputFile(
      path.join(appDir, "src", "main", "resources", "config.properties"),
      result
    );
    configSpinner.succeed("config.properties created successfully.");
  } catch (error) {
    configSpinner.fail("Failed to create config.properties.");
    console.error(error);
    process.exit(1);
  }

  // Step 4: Install dependencies (optional if applicable)
  console.log("\n");
  logStep("Installing dependencies...");
  const depSpinner = ora({
    text: "Installing dependencies...",
    color: "cyan",
  }).start();
  try {
    await execSync("npm install", { cwd: appDir, stdio: "inherit" });
    depSpinner.succeed("Dependencies installed successfully.");
  } catch (error) {
    depSpinner.fail("Failed to install dependencies.");
    console.error(error);
    process.exit(1);
  }

  // Step 5: Check for Tomcat
  console.log("\n");
  logStep("Checking for Tomcat...");
  const tomcatSpinner = ora({
    text: "Checking for Tomcat...",
    color: "cyan",
  }).start();
  try {
    const isWindows = process.platform === "win32";
    const command = isWindows ? "catalina.bat version" : "catalina version";
    execSync(command, { stdio: "ignore" });
    tomcatSpinner.succeed("Tomcat is installed.");
  } catch (error) {
    tomcatSpinner.fail("Tomcat is not installed.");
    console.log(
      chalk.white("Please install Tomcat to run the application.\n") +
        chalk.blue("https://tomcat.apache.org/download-90.cgi")
    );
  }

  // Done
  console.log(chalk.green.bold("\nSetup completed successfully!"));
  console.log(
    chalk.cyan(
      "\nNext Steps:\n" +
        `1. Navigate to the project directory:\n   cd ${projectName}\n` +
        "2. Open the project in your IDE.\n" +
        "3. Configure Tomcat to deploy from /app.\n" +
        "4. Start coding! 🤗 \n"
    )
  );
})();
