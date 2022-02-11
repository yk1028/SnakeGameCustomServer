DROP DATABASE IF EXISTS snakegame;
CREATE DATABASE snakegame;
USE snakegame;

CREATE TABLE users (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(255) NOT NULL,
  PRIMARY KEY(id)
);

CREATE TABLE records (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `win` BOOLEAN NOT NULL,
  PRIMARY KEY(id),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) on delete cascade
);