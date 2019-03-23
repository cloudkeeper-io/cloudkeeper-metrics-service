insert into DynamoProvisionedPrice (region, write, read) VALUES
('us-east-2', '0.00065', '0.00013'),
('ap-northeast-2', '0.0007049', '0.00014098'),
('us-west-2', '0.00065', '0.00013'),
('ap-northeast-3', '0.000742', '0.0001484'),
('ap-southeast-2', '0.00074', '0.000148'),
('eu-west-1', '0.000735', '0.000147'),
('eu-north-1', '0.000698', '0.00014'),
('us-east-1', '0.00065', '0.00013'),
('us-west-1', '0.000725', '0.000145'),
('ap-south-1', '0.00074', '0.000148'),
 ('ap-southeast-1', '0.00074', '0.000148'),
 ('ap-northeast-1', '0.000742', '0.0001484'),
 ('ca-central-1', '0.000715', '0.000143'),
 ('eu-central-1', '0.000793', '0.0001586'),
 ('eu-west-2', '0.000772', '0.0001544'),
 ('eu-west-3', '0.000772', '0.0001544'),
 ('sa-east-1', '0.000975', '0.000195');

-- $$('#element-1944cbcb-7c56-4222-942b-19d5872d007c div[data-region]').map((element) => [element.dataset.region, ...[...element.querySelectorAll('tr td:nth-of-type(2)')].map(x => x.innerHTML)])
