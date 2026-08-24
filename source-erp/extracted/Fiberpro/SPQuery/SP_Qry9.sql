/*;=============================================   
; Author           :  Global Software's    
; Create date      :  22/12/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  27/12/2022 10.16 AM 
; =============================================  */  
CREATE PROCEDURE SP_Qry9 (@Ordid int,@Styleno Varchar(30),@comboId int,@ColID int,@SizeID int,@PartId int,@CompId Varchar(1000),@coycode int,@LotNo Varchar(50))
AS 

BEGIN DECLARE @SQLSTR AS NVARCHAR(Max) Set @SQLSTR=N'
 Select IsNull(Sum(X.OrderQty-X.CutJobQty),0) As Expr1 From (
  
  SELECT  A.compId,Mas_Size.SizeDesc, isNull(TotalQty,0) as OrderQty, 0 As CutJobQty FROM Trs_JobOrder_PanelStock A INNER JOIN OrderMas ON A.Ordid = OrderMas.Ordid   Inner Join Mas_Size On A.SizeId=Mas_Size.SizeId WHERE ExpId=@Coycode  AND A.OrdID =@Ordid AND A.StyleNo=@Styleno AND A.ComboID=@comboId AND A.ColID =@ColId And A.PartID  = @PartId And A.CompID in (((Select ID From fnSplitter(@CompId))))  and A.LotNo=@LotNo 
  And A.SizeID = @SizeID
UNION
  
  SELECT C.CompId, Mas_Size.SizeDesc, 0 as OrderQty, Sum(Cutting_Job_Dtl.OrdQty) as  CutJobqty FROM   Cutting_Job INNER JOIN Cutting_Job_Dtl ON Cutting_Job.Id = Cutting_Job_Dtl.ID 
  INNER JOIN Prod_CutComponents C ON Cutting_Job.OrdID = c.OrdId And Cutting_Job.StyleNo = C.StyleNo And Cutting_Job_Dtl.PartId = C.PartId
  And Cutting_Job.ID = c.JobId    INNER JOIN Mas_Size ON Cutting_Job_Dtl.SizeID = Mas_Size.SizeID where  Cutting_Job.Coycode=@Coycode and Cutting_Job.OrdId=@Ordid AND Cutting_Job.StyleNo=@Styleno  AND Cutting_Job_Dtl.ColID=@ColId AND Cutting_Job_Dtl.LOTNO =@LotNo And cutting_Job_Dtl.PartID = @PartID And CmbClrID = @ComboId 
  And cutting_Job_Dtl.SizeID = @SizeID
  and c.CompId in (((Select ID From fnSplitter(@CompId)))) Group BY C.compId,SizeDesc
  
   ) X 
   '  EXEC SP_EXECUTESQL @SQLSTR,N'@Ordid int,@Styleno Varchar(30),@comboId int,@ColID int,@SizeID int,@PartId int,@CompId Varchar(1000),@coycode int,@LotNo Varchar(50)',@Ordid= @Ordid, @Styleno = @Styleno,@comboId = @comboId ,@ColID = @ColID, @SizeID = @SizeID  , @PartId = @PartId ,@CompId = @CompId , @Coycode=@Coycode,@LotNo=@LotNo End

--SP_Qry9 4842,'HGGFG',23,23,2,1,'1',1,'--'



