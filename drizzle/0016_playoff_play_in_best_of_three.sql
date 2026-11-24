UPDATE `playoff_matchup` SET `best_of` = 3 WHERE `round` = 'play-in' AND `best_of` = 2 AND `season_id` IN (SELECT `id` FROM `season` WHERE `name` = 'Otoño 2026');
