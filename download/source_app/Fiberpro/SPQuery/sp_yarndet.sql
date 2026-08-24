/*;=============================================   
; Author           :  Global Software's    
; Create date      :  22/05/2023 
; Create By        :  chandru  
; Description      :  QUERY
; Change Person    :  chandru
; Last Change Date :  26/12/2023 10.36 AM 
; =============================================  */  
     
 Create  PROCEDURE sp_yarndet (@Ordid as int,@Dept as int ) as 




  select distinct  @Dept as Dept,x.CountName,x.colordesc,sum(x.Reqkgs) as Reqkgs ,sum(x.grnkgs) as grn,sum(x.openkgs) as openingkgs,sum(Prsgrnkgs) as Prsgrnkgs ,sum(Trnsin) as Trnsin ,sum(transout) as transout,sum(stockkgs) as stockkgs ,sum(issuekgs) - sum(issuret) as issuekgs,Receivngdept,0 as reprsdc ,0 as reprsrec ,0 as reprsbalance ,recdeptid as recdeptid ,@Ordid as  Ordid,0 as slno,'N'   from(  



  select distinct Mas_count.CountName as CountName,isnull(ColorDesc,'') as ColorDesc,sum(Pro_ReqYarn.reqkgs) as Reqkgs ,0 as grnkgs, 0 as Prsgrnkgs,0 as Trnsin ,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs ,'' as Receivngdept,0  as issuret,0 as recdeptid      from Ordermas inner join Pro_ReqYarn on Pro_ReqYarn.Ordid = OrderMas.OrdId    left outer join Mas_color on    Pro_reqyarn.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = Pro_ReqYarn.CountId  where ordermas.ordid =
@Ordid and Deptid in(@Dept) group

 by CountName ,ColorDesc











   	union all	select distinct CountName as CountName,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,isnull(sum(Trs_grn2.RecKgs),0) as  grnkgs, 0 as Prsgrnkgs,0 as Trnsin,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept,0  as issuret,0 as recdeptid      from Ordermas inner join Trs_grn2 on Trs_GRN2.ordid = Ordermas.OrdId  inner join stocktable on stocktable.StockID =trs_grn2.StockID  inner join trs_grn1 on trs_grn2.id = trs_grn1.ID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = stocktable.CntID where ordermas.OrdId=@Ordid and StockTable.Dept in(@Dept)  and trs_grn1.GRNType = 'Purchase'  group by CountName,ColorDesc,Trs_grn2.RecKgs
union all




	select distinct CountName as CountName,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs  ,0 as grnkgs ,isnull(sum(Trs_grn2.RecKgs),0) as  Prsgrnkgs,0 as Trnsin,0  as transout,0 as openkgs,0  as stockkgs ,0 as issuekgs ,'' as Receivngdept,0  as issuret,0 as 
recdeptid      from Ordermas inner join Trs_grn2 on Trs_GRN2.ordid = Ordermas.OrdId  inner join stocktable on stocktable.StockID =trs_grn2.StockID  inner join trs_grn1 on trs_grn2.id = trs_grn1.ID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = stocktable.CntID where ordermas.OrdId=@Ordid and StockTable.Dept in(@Dept)  and trs_grn1.GRNType = 'Process'  and processtype ='P'   group by CountName,ColorDesc,Trs_grn2.RecKgs
union all
		  select distinct  CountName as CountName,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,sum(Trs_Del2.kg) as Trnsin,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept,0  as issuret,0 as recdeptid    
  from Ordermas inner join Trs_Del2 on Trs_Del2.ordid  = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID inner join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = stocktable.CntID where Trs_del2.TranOrdID=@Ordid and Trs_Del1.Prs_Dept  in(@Dept)  and trs_del1.TrType = 3 and stocktable.dept  in(@Dept) group by CountName,ColorDesc,Trs_Del2.Kg 	



union all



		



  select distinct  CountName as CountName,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,sum(Trs_Del2.kg) as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept,0  as issuret,0 as recdeptid      from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId inner join trs_del1 on trs_del2.id = trs_del1.ID inner join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on   stocktable.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = stocktable.CntID where Trs_del2.OrdId=@Ordid and Trs_Del1.Prs_Dept   in(@Dept)  and trs_del1.TrType = 3 group by CountName,ColorDesc,Trs_Del2.Kg	 







  union all



  



       select distinct  CountName as CountName,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,sum(Trs_Opening.Kgs) as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept,0  as issuret,0 as recdeptid       from Ordermas inner join
 Trs_Opening on Trs_Opening.ordid = OrderMas.OrdId  inner join  stocktable on stocktable.StockID =Trs_Opening.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = stocktable.CntID where Trs_Opening.OrdID=@Ordid and Trs_Opening.Dept  in(@Dept)  and stocktable.dept  in(@Dept) group by CountName,ColorDesc,Trs_Opening.Kgs 


  union all

        select distinct  CountName as CountName,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs,sum(currentstock.Kg) as stockkgs,0 as issuekgs,'' as Receivngdept ,0  as issuret,0 as recdeptid     from Ordermas inner join 
Currentstock on Currentstock.ordid = OrderMas.OrdId  inner join stocktable on stocktable.StockID =Currentstock.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = stocktable.CntID where Currentstock.OrdId=@Ordid and stocktable.Dept  in(@Dept) group by CountName,ColorDesc,Currentstock.Kg
 	union all 	
	       select distinct  CountName as CountName,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs,0  as stockkgs,sum(Trs_del2.kg) as issuekgs,'' as Receivngdept,0  as issuret,0 as recdeptid 
      from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID inner join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID
 left outer join Mas_count on Mas_count.CountID = stocktable.CntID inner join Mas_Dept on Mas_Dept.DeptID =Trs_Del1.Prs_Dept  where ordermas.OrdId=@Ordid and StockTable.Dept    in(@Dept) and ProcessType ='P' and TrType = 1  group by CountName,ColorDesc,Trs_Del2.Kg

union all 

select distinct  CountName as CountName,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs,0  as stockkgs,sum(Trs_del2.kg) as issuekgs,Deptname as Receivngdept,0  as issuret,Mas_Dept.DeptID  as recdeptid    from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID inner join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = stocktable.CntID inner join Mas_Dept on Mas_Dept.DeptID =Trs_Del1.Prs_Dept  where ordermas.OrdId=@Ordid and StockTable.Dept    in(@Dept) and ProcessType ='P' and TrType = 1  group by CountName,ColorDesc,Trs_Del2.Kg,Deptname,Mas_Dept.DeptID




union all



	select distinct CountName as CountName,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs  ,0 as grnkgs ,0 as  Prsgrnkgs,0 as Trnsin,0  as transout,0 as openkgs,0  as stockkgs ,0 as issuekgs ,Mas_Dept.Deptname  as Receivngdept,isnull(sum(Trs_grn2.RecKgs),0) as issuret,Mas_Dept.DeptID as recdeptid   from Ordermas inner join Trs_grn2 on Trs_GRN2.ordid = Ordermas.OrdId  inner join stocktable on stocktable.StockID =trs_grn2.StockID  inner join trs_grn1 on trs_grn2.id = trs_grn1.ID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = stocktable.CntID inner join Mas_Dept on Mas_Dept.DeptID = Trs_GRN1.Dept  where ordermas.OrdId=@Ordid and StockTable.Dept in(@Dept)  and trs_grn1.GRNType = 'Process Return'   group by CountName,ColorDesc,Trs_grn2.RecKgs,Deptname,Mas_Dept.DeptID 

	union all

		select distinct CountName as CountName,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs  ,0 as grnkgs ,0 as  Prsgrnkgs,0 as Trnsin,0  as transout,0 as openkgs,0  as stockkgs ,0 as issuekgs ,'' as Receivngdept,isnull(sum(Trs_grn2.RecKgs),0) as issuret,0 as recdeptid   from Ordermas inner join Trs_grn2 on Trs_GRN2.ordid = Ordermas.OrdId  inner join stocktable on stocktable.StockID =trs_grn2.StockID  inner join trs_grn1 on trs_grn2.id = trs_grn1.ID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = stocktable.CntID inner join Mas_Dept on Mas_Dept.DeptID = Trs_GRN1.Dept  where ordermas.OrdId=@Ordid and StockTable.Dept in(@Dept)  and trs_grn1.GRNType = 'Process Return'   group by CountName,ColorDesc,Trs_grn2.RecKgs,Deptname,Mas_Dept.DeptID 



	) x  group by CountName,ColorDesc,Receivngdept,recdeptid