-- Volleyball Fest Database Seed
-- Run with: sqlite3 sqlite.db < drizzle/seed.sql

-- Clear existing data (in correct order due to foreign keys)
DELETE FROM player;
DELETE FROM season_team;
DELETE FROM team;
DELETE FROM category;
DELETE FROM position;
DELETE FROM season;

-- ============================================
-- SEASONS
-- ============================================
INSERT INTO season (id, name, start_date, end_date, state) VALUES
  ('season-2025-fall', 'Fall 2025', '2025-09-01', '2025-11-30', 'completed'),
  ('season-2026-spring', 'Spring 2026', '2026-02-01', '2026-05-31', 'signup_open');

-- ============================================
-- CATEGORIES
-- ============================================
INSERT INTO category (id, name, description) VALUES
  ('cat-varonil-libre', 'Varonil Libre', 'Categoría varonil libre - todos los niveles de habilidad'),
  ('cat-segunda-fuerza', 'Segunda Fuerza', 'Categoría segunda fuerza'),
  ('cat-femenil', 'Femenil', 'Categoría femenil');

-- ============================================
-- POSITIONS
-- ============================================
INSERT INTO position (id, name) VALUES
  ('pos-atacante-exterior', 'Atacante Exterior'),
  ('pos-central', 'Central'),
  ('pos-opuesto', 'Opuesto'),
  ('pos-colocador', 'Colocador'),
  ('pos-libero', 'Libero');

-- ============================================
-- TEAMS
-- ============================================
INSERT INTO team (id, name, logo_url, category_id, captain_name, captain_phone, co_captain_name, co_captain_phone, unavailable_dates, coming_from) VALUES
  -- Varonil Libre Teams
  ('team-thunder', 'Thunder Spikers', 'https://api.dicebear.com/7.x/initials/svg?seed=TS&backgroundColor=3b82f6', 'cat-varonil-libre', 'Marcus Johnson', '555-0101', 'Derek Williams', '555-0102', '2025-04-12,2025-04-19', 'San Francisco, CA'),
  ('team-phoenix', 'Phoenix Rising', 'https://api.dicebear.com/7.x/initials/svg?seed=PR&backgroundColor=ef4444', 'cat-varonil-libre', 'James Chen', '555-0103', 'Ryan Martinez', '555-0104', '2025-04-05', 'Los Angeles, CA'),
  ('team-titans', 'Beach Titans', 'https://api.dicebear.com/7.x/initials/svg?seed=BT&backgroundColor=22c55e', 'cat-varonil-libre', 'Michael Brown', '555-0105', 'Chris Taylor', '555-0106', '', 'San Diego, CA'),

  -- Femenil Teams
  ('team-queens', 'Net Queens', 'https://api.dicebear.com/7.x/initials/svg?seed=NQ&backgroundColor=ec4899', 'cat-femenil', 'Sarah Miller', '555-0201', 'Emily Davis', '555-0202', '2025-04-26', 'Oakland, CA'),
  ('team-stars', 'Stellar Stars', 'https://api.dicebear.com/7.x/initials/svg?seed=SS&backgroundColor=8b5cf6', 'cat-femenil', 'Jessica Wong', '555-0203', 'Amanda Lee', '555-0204', '', 'San Jose, CA'),
  ('team-waves', 'Wave Riders', 'https://api.dicebear.com/7.x/initials/svg?seed=WR&backgroundColor=06b6d4', 'cat-femenil', 'Nicole Garcia', '555-0205', 'Rachel Kim', '555-0206', '2025-05-03,2025-05-10', 'Santa Cruz, CA'),

  -- Segunda Fuerza Teams
  ('team-sunnyside', 'Sunnyside Crew', 'https://api.dicebear.com/7.x/initials/svg?seed=SC&backgroundColor=f59e0b', 'cat-segunda-fuerza', 'David Park', '555-0301', 'Lisa Thompson', '555-0302', '', 'Berkeley, CA'),
  ('team-mixers', 'Court Mixers', 'https://api.dicebear.com/7.x/initials/svg?seed=CM&backgroundColor=10b981', 'cat-segunda-fuerza', 'Kevin Nguyen', '555-0303', 'Stephanie Cruz', '555-0304', '2025-04-19', 'Fremont, CA'),
  ('team-fusion', 'Power Fusion', 'https://api.dicebear.com/7.x/initials/svg?seed=PF&backgroundColor=f97316', 'cat-segunda-fuerza', 'Andrew Scott', '555-0401', 'Megan White', '555-0402', '', 'Palo Alto, CA'),
  ('team-united', 'United Force', 'https://api.dicebear.com/7.x/initials/svg?seed=UF&backgroundColor=6366f1', 'cat-segunda-fuerza', 'Brandon Lee', '555-0403', 'Christina Patel', '555-0404', '2025-05-17', 'Mountain View, CA'),
  ('team-legends', 'Court Legends', 'https://api.dicebear.com/7.x/initials/svg?seed=CL&backgroundColor=78716c', 'cat-segunda-fuerza', 'Robert Anderson', '555-0501', 'Patricia Moore', '555-0502', '', 'Walnut Creek, CA'),
  ('team-classic', 'Classic Spikers', 'https://api.dicebear.com/7.x/initials/svg?seed=CS&backgroundColor=a855f7', 'cat-segunda-fuerza', 'William Harris', '555-0503', 'Susan Clark', '555-0504', '2025-04-12', 'Pleasanton, CA');

-- ============================================
-- SEASON-TEAM ASSOCIATIONS (Spring 2025)
-- ============================================
INSERT INTO season_team (season_id, team_id) VALUES
  ('season-2026-spring', 'team-thunder'),
  ('season-2026-spring', 'team-phoenix'),
  ('season-2026-spring', 'team-titans'),
  ('season-2026-spring', 'team-queens'),
  ('season-2026-spring', 'team-stars'),
  ('season-2026-spring', 'team-waves'),
  ('season-2026-spring', 'team-sunnyside'),
  ('season-2026-spring', 'team-mixers'),
  ('season-2026-spring', 'team-fusion'),
  ('season-2026-spring', 'team-united'),
  ('season-2026-spring', 'team-legends'),
  ('season-2026-spring', 'team-classic');

-- ============================================
-- PLAYERS
-- ============================================

-- Thunder Spikers Players
INSERT INTO player (id, name, jersey_number, position_id, team_id) VALUES
  ('player-001', 'Marcus Johnson', '1', 'pos-colocador', 'team-thunder'),
  ('player-002', 'Derek Williams', '7', 'pos-atacante-exterior', 'team-thunder'),
  ('player-003', 'Tyler Adams', '12', 'pos-central', 'team-thunder'),
  ('player-004', 'Jordan Blake', '4', 'pos-opuesto', 'team-thunder'),
  ('player-005', 'Nathan Cole', '9', 'pos-libero', 'team-thunder'),
  ('player-006', 'Austin Rivera', '15', 'pos-atacante-exterior', 'team-thunder');

-- Phoenix Rising Players
INSERT INTO player (id, name, jersey_number, position_id, team_id) VALUES
  ('player-007', 'James Chen', '3', 'pos-colocador', 'team-phoenix'),
  ('player-008', 'Ryan Martinez', '10', 'pos-opuesto', 'team-phoenix'),
  ('player-009', 'Daniel Kim', '5', 'pos-atacante-exterior', 'team-phoenix'),
  ('player-010', 'Eric Thompson', '8', 'pos-central', 'team-phoenix'),
  ('player-011', 'Alex Ramirez', '2', 'pos-libero', 'team-phoenix'),
  ('player-012', 'Jake Morrison', '14', 'pos-libero', 'team-phoenix');

-- Beach Titans Players
INSERT INTO player (id, name, jersey_number, position_id, team_id) VALUES
  ('player-013', 'Michael Brown', '6', 'pos-colocador', 'team-titans'),
  ('player-014', 'Chris Taylor', '11', 'pos-atacante-exterior', 'team-titans'),
  ('player-015', 'Matt Wilson', '17', 'pos-central', 'team-titans'),
  ('player-016', 'Sean Murphy', '22', 'pos-opuesto', 'team-titans'),
  ('player-017', 'Brian Foster', '3', 'pos-libero', 'team-titans'),
  ('player-018', 'Kyle Bennett', '9', 'pos-atacante-exterior', 'team-titans');

-- Net Queens Players
INSERT INTO player (id, name, jersey_number, position_id, team_id) VALUES
  ('player-019', 'Sarah Miller', '1', 'pos-colocador', 'team-queens'),
  ('player-020', 'Emily Davis', '8', 'pos-atacante-exterior', 'team-queens'),
  ('player-021', 'Ashley Rodriguez', '13', 'pos-central', 'team-queens'),
  ('player-022', 'Brittany Nelson', '5', 'pos-opuesto', 'team-queens'),
  ('player-023', 'Kayla Mitchell', '10', 'pos-libero', 'team-queens'),
  ('player-024', 'Morgan Hayes', '7', 'pos-libero', 'team-queens');

-- Stellar Stars Players
INSERT INTO player (id, name, jersey_number, position_id, team_id) VALUES
  ('player-025', 'Jessica Wong', '2', 'pos-colocador', 'team-stars'),
  ('player-026', 'Amanda Lee', '14', 'pos-atacante-exterior', 'team-stars'),
  ('player-027', 'Samantha Park', '6', 'pos-central', 'team-stars'),
  ('player-028', 'Lauren Chen', '11', 'pos-opuesto', 'team-stars'),
  ('player-029', 'Olivia Tran', '4', 'pos-libero', 'team-stars'),
  ('player-030', 'Emma Nguyen', '9', 'pos-atacante-exterior', 'team-stars');

-- Wave Riders Players
INSERT INTO player (id, name, jersey_number, position_id, team_id) VALUES
  ('player-031', 'Nicole Garcia', '3', 'pos-colocador', 'team-waves'),
  ('player-032', 'Rachel Kim', '12', 'pos-atacante-exterior', 'team-waves'),
  ('player-033', 'Hannah Martinez', '7', 'pos-central', 'team-waves'),
  ('player-034', 'Sophia Hernandez', '15', 'pos-opuesto', 'team-waves'),
  ('player-035', 'Victoria Lopez', '1', 'pos-libero', 'team-waves'),
  ('player-036', 'Isabella Flores', '8', 'pos-libero', 'team-waves');

-- Sunnyside Crew Players (Segunda Fuerza)
INSERT INTO player (id, name, jersey_number, position_id, team_id) VALUES
  ('player-037', 'David Park', '5', 'pos-colocador', 'team-sunnyside'),
  ('player-038', 'Lisa Thompson', '10', 'pos-atacante-exterior', 'team-sunnyside'),
  ('player-039', 'Tom Bradley', '17', 'pos-central', 'team-sunnyside'),
  ('player-040', 'Jennifer Walsh', '3', 'pos-opuesto', 'team-sunnyside'),
  ('player-041', 'Steve Carter', '8', 'pos-libero', 'team-sunnyside'),
  ('player-042', 'Michelle Yang', '14', 'pos-atacante-exterior', 'team-sunnyside');

-- Court Mixers Players (Segunda Fuerza)
INSERT INTO player (id, name, jersey_number, position_id, team_id) VALUES
  ('player-043', 'Kevin Nguyen', '2', 'pos-colocador', 'team-mixers'),
  ('player-044', 'Stephanie Cruz', '9', 'pos-atacante-exterior', 'team-mixers'),
  ('player-045', 'Jason Lee', '11', 'pos-central', 'team-mixers'),
  ('player-046', 'Amy Richardson', '6', 'pos-opuesto', 'team-mixers'),
  ('player-047', 'Mark Sullivan', '4', 'pos-libero', 'team-mixers'),
  ('player-048', 'Kelly Patterson', '13', 'pos-libero', 'team-mixers');

-- Power Fusion Players (Segunda Fuerza)
INSERT INTO player (id, name, jersey_number, position_id, team_id) VALUES
  ('player-049', 'Andrew Scott', '1', 'pos-colocador', 'team-fusion'),
  ('player-050', 'Megan White', '7', 'pos-atacante-exterior', 'team-fusion'),
  ('player-051', 'Brian Cooper', '15', 'pos-central', 'team-fusion'),
  ('player-052', 'Diana Ross', '4', 'pos-opuesto', 'team-fusion'),
  ('player-053', 'Nick Howard', '12', 'pos-libero', 'team-fusion'),
  ('player-054', 'Christina Bell', '9', 'pos-atacante-exterior', 'team-fusion');

-- United Force Players (Segunda Fuerza)
INSERT INTO player (id, name, jersey_number, position_id, team_id) VALUES
  ('player-055', 'Brandon Lee', '6', 'pos-colocador', 'team-united'),
  ('player-056', 'Christina Patel', '11', 'pos-atacante-exterior', 'team-united'),
  ('player-057', 'Greg Turner', '3', 'pos-central', 'team-united'),
  ('player-058', 'Anna Jackson', '8', 'pos-opuesto', 'team-united'),
  ('player-059', 'Mike Reynolds', '2', 'pos-libero', 'team-united'),
  ('player-060', 'Laura Sanders', '14', 'pos-libero', 'team-united');

-- Court Legends Players (Segunda Fuerza)
INSERT INTO player (id, name, jersey_number, position_id, team_id) VALUES
  ('player-061', 'Robert Anderson', '10', 'pos-colocador', 'team-legends'),
  ('player-062', 'Patricia Moore', '5', 'pos-atacante-exterior', 'team-legends'),
  ('player-063', 'Thomas Wright', '17', 'pos-central', 'team-legends'),
  ('player-064', 'Barbara King', '3', 'pos-opuesto', 'team-legends'),
  ('player-065', 'Richard Green', '8', 'pos-libero', 'team-legends'),
  ('player-066', 'Nancy Baker', '12', 'pos-libero', 'team-legends');

-- Classic Spikers Players (Segunda Fuerza)
INSERT INTO player (id, name, jersey_number, position_id, team_id) VALUES
  ('player-067', 'William Harris', '1', 'pos-colocador', 'team-classic'),
  ('player-068', 'Susan Clark', '9', 'pos-atacante-exterior', 'team-classic'),
  ('player-069', 'George Walker', '14', 'pos-central', 'team-classic'),
  ('player-070', 'Karen Allen', '6', 'pos-opuesto', 'team-classic'),
  ('player-071', 'Donald Hill', '4', 'pos-libero', 'team-classic'),
  ('player-072', 'Betty Young', '11', 'pos-atacante-exterior', 'team-classic');

-- Verification: Count records
SELECT 'Seasons: ' || COUNT(*) FROM season;
SELECT 'Categories: ' || COUNT(*) FROM category;
SELECT 'Positions: ' || COUNT(*) FROM position;
SELECT 'Teams: ' || COUNT(*) FROM team;
SELECT 'Players: ' || COUNT(*) FROM player;
SELECT 'Season-Team links: ' || COUNT(*) FROM season_team;
