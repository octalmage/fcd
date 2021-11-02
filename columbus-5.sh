# This is NOT A SCRIPT. DO NOT RUN IT wholesale. READ IT and MODIFY as necessary
# and run the steps individually. These are rough steps to setup a Columbus 5
# FCD.

# Install node js
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
apt-get install -y nodejs

# Install Postgres 12
sudo apt-get -y install postgresql-12

# Depending on your server setup you may want to move the postgres storage to a
# different location. Possibly a volume with more space. As of Nov. 1. Our col 5
# fcd is using approximately 70G.

# Move database to volume with more space
pg_ctlcluster 12 main stop

sudo rsync -av /var/lib/postgresql <YOUR POSTGRESQL DATA DIR>

# Edit postgresql conf
emacs /etc/postgresql/12/main/postgresql.conf
# Change data directory to
# data_directory = '<YOUR POSTGRESQL DATA DIR>/postgresql/12/main'

pg_ctlcluster 12 main start

# Check the data directory. Should show your new postgresql data dir.
echo "SHOW data_directory;" | sudo -u postgres psql

# Create the FCD database
su - postgres

createuser fcd
createdb fcd

# In psql
echo "alter user fcd with encrypted password 'fcd';" | psql
echo "grant all privileges on database fcd to fcd;" | psql

# Setup FCD
su - <YOUR FCD USER>

# Setup for col 5 fcd

git clone https://github.com/etfinder/fcd.git
cd fcd
git checkout fd881fe
npm install

# Setup the database connection parameters. Edit if necessary.
echo $"module.exports = {
  name: 'default',
  type: 'postgres',
  host: 'localhost',
  database: 'fcd',
  username: 'fcd',
  password: 'fcd',
  synchronize: true
}
" > ormconfig.js

# The FCD can error out when a contract migration/instantiation transaction
# references code/contract from columbus 4 that is not present in the FCD
# database.
#
# This seeding script fetches all the contracts from TFL servers from columbus 4
# and inserts them into our database.
npm run seed-contracts

INITIAL_HEIGHT=4724001 \
LCD_URI=<YOUR LCD ENDPOINT> \
CHAIN_ID=columbus-5 \
RPC_URI=<YOUR RPC ENDPOINT> \
npm run collector

